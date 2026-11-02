import { INITIAL_FEN } from "@/lib/guest/engine";
import { GUEST_USER_ID } from "@/lib/guest/mode";
import { GUEST_PUZZLES, pickNextGuestPuzzle } from "@/lib/guest/puzzles";
import {
    GUEST_BOTS,
    GuestGame,
    getGuestBot,
    guestUser,
    loadGuestData,
    newGuestId,
    saveGuestGame,
    updateGuestData,
} from "@/lib/guest/store";

const ALLOWED_MINUTES = [1, 3, 5, 10, 15, 30, 60];
const TIME_MODES = ["BULLET", "BLITZ", "RAPID", "CLASSICAL"];

const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const error = (message: string, status = 400) => json({ error: message }, status);

async function body(init?: RequestInit): Promise<Record<string, unknown>> {
    try {
        const parsed = JSON.parse(String(init?.body ?? "{}"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function gameForHistory(game: GuestGame) {
    const data = loadGuestData();
    const human = guestUser(data);
    const player = { id: human.id, name: human.name, username: human.username, elo: human.elo, createdAt: human.createdAt };
    return {
        id: game.id,
        guest: true,
        status: game.status,
        result: game.result ?? null,
        winnerId: game.winnerId ?? null,
        timeMode: game.timeMode,
        timeLimit: game.timeLimit,
        createdAt: new Date(game.createdAt).toISOString(),
        playerWhiteId: game.humanColor === "w" ? GUEST_USER_ID : null,
        playerBlackId: game.humanColor === "b" ? GUEST_USER_ID : null,
        playerWhite: game.humanColor === "w" ? player : null,
        playerBlack: game.humanColor === "b" ? player : null,
        bot: getGuestBot(game.botId) ?? null,
        _count: { moves: game.moves.length },
    };
}

function userPayload() {
    const data = loadGuestData();
    const games = Object.values(data.games).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    const puzzleHistory = Object.entries(data.puzzles)
        .sort(([, a], [, b]) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(([puzzleId, p]) => {
            const puzzle = GUEST_PUZZLES.find((x) => x.id === puzzleId);
            return {
                id: puzzleId,
                puzzleId,
                attempts: p.attempts,
                solved: p.solved,
                lastAttemptAt: new Date(p.lastAttemptAt).toISOString(),
                createdAt: new Date(p.createdAt).toISOString(),
                puzzle: puzzle ? { id: puzzle.id, themes: puzzle.themes, startFen: puzzle.startFen, difficulty: puzzle.difficulty } : null,
            };
        });
    return { user: guestUser(data), gameHistory: games.map(gameForHistory), ratingHistory: [], puzzleHistory };
}

async function createGame(init?: RequestInit) {
    const b = await body(init);
    if (b.mode !== "bot") return error("Les parties en ligne ne sont pas disponibles hors ligne");
    const bot = typeof b.botId === "string" ? getGuestBot(b.botId) : undefined;
    if (!bot) return error("Bot inexistant");

    let timeLimit: number | null = null;
    if (b.timeLimit !== undefined && b.timeLimit !== null && b.timeLimit !== "") {
        const minutes = Number(b.timeLimit);
        if (!ALLOWED_MINUTES.includes(minutes)) return error("Durée invalide");
        timeLimit = minutes * 60_000;
    }
    const timeMode = String(b.timeMode ?? "RAPID").toUpperCase();
    if (!TIME_MODES.includes(timeMode)) return error("Mode de jeu invalide");

    const humanColor = b.color === "white" ? "w" : b.color === "black" ? "b" : Math.random() < 0.5 ? "w" : "b";
    const now = Date.now();
    const game: GuestGame = {
        id: newGuestId(),
        botId: bot.id,
        humanColor,
        timeMode,
        timeLimit,
        fen: INITIAL_FEN,
        moves: [],
        capturedPieces: { white: [], black: [] },
        whiteTimeLeft: timeLimit,
        blackTimeLeft: timeLimit,
        lastMoveAt: now,
        status: "IN_PROGRESS",
        createdAt: now,
    };
    saveGuestGame(game);
    return json({ gameId: game.id, guest: true });
}

function nextPuzzle(url: URL) {
    const data = loadGuestData();
    const puzzle = pickNextGuestPuzzle(url.searchParams.get("themeCategory") ?? undefined, data.puzzles);
    if (!puzzle) return error("Aucun nouveau puzzle disponible", 404);
    if (!data.puzzles[puzzle.id]) {
        updateGuestData((d) => {
            d.puzzles[puzzle.id] = { attempts: 0, solved: false, lastAttemptAt: Date.now(), createdAt: Date.now() };
        });
    }
    return json({
        puzzleId: puzzle.id,
        themes: puzzle.themes,
        startFen: puzzle.startFen,
        difficulty: puzzle.difficulty,
        solution: puzzle.solution,
    });
}

async function updatePuzzle(init?: RequestInit) {
    const b = await body(init);
    const puzzleId = typeof b.puzzleId === "string" ? b.puzzleId : "";
    if (!GUEST_PUZZLES.some((p) => p.id === puzzleId)) return error("Puzzle introuvable", 404);
    const solved = b.solved === true;
    updateGuestData((d) => {
        const now = Date.now();
        const prev = d.puzzles[puzzleId];
        d.puzzles[puzzleId] = {
            attempts: (prev?.attempts ?? 0) + 1,
            solved,
            lastAttemptAt: now,
            createdAt: prev?.createdAt ?? now,
        };
    });
    return json({ success: true });
}

async function profile(init?: RequestInit) {
    const b = await body(init);
    const name = typeof b.name === "string" ? b.name.trim() : undefined;
    const username = typeof b.username === "string" ? b.username.trim() : undefined;
    if (name !== undefined && (name.length < 1 || name.length > 80)) return error("Nom invalide");
    if (username !== undefined && !/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
        return error("Nom d'utilisateur invalide (3-30 caractères : lettres, chiffres, _ . -)");
    }
    const data = updateGuestData((d) => {
        if (name !== undefined) d.profile.name = name;
        if (username !== undefined) d.profile.username = username;
    });
    window.dispatchEvent(new Event("checkmate:guest-updated"));
    return json({ user: guestUser(data) });
}

async function preference(method: string, init?: RequestInit) {
    if (method === "POST") {
        const theme = (await body(init)).theme;
        if (typeof theme !== "string" || !/^[a-z0-9_-]{1,32}$/.test(theme)) return error("Thème invalide");
        updateGuestData((d) => {
            d.theme = theme;
        });
        return json({ preference: { theme } });
    }
    const theme = loadGuestData().theme;
    return json({ preference: theme ? { theme } : null });
}

function leaderboard() {
    const data = loadGuestData();
    const me = guestUser(data);
    const users = [
        { id: me.id, name: me.name, username: me.username, elo: me.elo, image: null, createdAt: me.createdAt },
        ...GUEST_BOTS.map((b) => ({ id: b.id, name: b.username, username: b.username, elo: b.elo, image: b.img, createdAt: me.createdAt })),
    ].sort((a, b) => b.elo - a.elo);
    const today = new Date().setHours(0, 0, 0, 0);
    const games = Object.values(data.games);
    return json({
        user: me,
        users,
        counts: {
            gamesToday: games.filter((g) => g.createdAt >= today).length,
            inProgress: games.filter((g) => g.status === "IN_PROGRESS").length,
            players: users.length,
        },
    });
}

/** Serves the app's /api calls from the browser (localStorage) when there is no database. */
export async function guestFetch(input: string, init?: RequestInit): Promise<Response> {
    const url = new URL(input, "http://guest.local");
    const method = (init?.method ?? "GET").toUpperCase();

    switch (`${method} ${url.pathname}`) {
        case "GET /api/bots":
            return json(GUEST_BOTS);
        case "GET /api/user":
            return json(userPayload());
        case "PATCH /api/user":
            return profile(init);
        case "GET /api/user-preference":
        case "POST /api/user-preference":
            return preference(method, init);
        case "POST /api/games/create":
            return createGame(init);
        case "GET /api/puzzles/next":
            return nextPuzzle(url);
        case "POST /api/puzzles/update":
            return updatePuzzle(init);
        case "POST /api/puzzles/reset":
            updateGuestData((d) => {
                d.puzzles = {};
            });
            return json({ success: true });
        case "GET /api/leaderboard":
            return leaderboard();
        default:
            return error("Indisponible en mode invité (hors ligne)", 503);
    }
}
