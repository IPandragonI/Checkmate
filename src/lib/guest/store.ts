import type { CapturedPieces, Move } from "@/app/types/game";
import { BOT_DEFINITIONS } from "@/lib/bots-data";
import { GUEST_USER_ID } from "@/lib/guest/mode";

const STORAGE_KEY = "checkmate.guest.data.v1";
const MAX_GAMES = 50;

export interface GuestBot {
    id: string;
    username: string;
    label: string;
    elo: number;
    img: string;
}

export const GUEST_BOTS: GuestBot[] = BOT_DEFINITIONS.map((b) => ({ ...b, id: `bot-${b.username.toLowerCase()}` }));

export interface GuestGame {
    id: string;
    botId: string;
    humanColor: "w" | "b";
    timeMode: string;
    timeLimit: number | null;
    fen: string;
    moves: Move[];
    capturedPieces: CapturedPieces;
    whiteTimeLeft: number | null;
    blackTimeLeft: number | null;
    lastMoveAt: number;
    status: "IN_PROGRESS" | "FINISHED";
    result?: string;
    winnerId?: string | null;
    createdAt: number;
    finishedAt?: number;
}

export interface GuestPuzzleProgress {
    attempts: number;
    solved: boolean;
    lastAttemptAt: number;
    createdAt: number;
}

export interface GuestData {
    profile: { name: string; username: string };
    elo: number;
    createdAt: number;
    theme: string | null;
    games: Record<string, GuestGame>;
    puzzles: Record<string, GuestPuzzleProgress>;
}

function emptyData(): GuestData {
    return {
        profile: { name: "Invité", username: "invite" },
        elo: 400,
        createdAt: Date.now(),
        theme: null,
        games: {},
        puzzles: {},
    };
}

// Fallback when localStorage is unavailable (private mode, blocked storage): data lives for this page load only.
let memory: GuestData | null = null;

export function loadGuestData(): GuestData {
    try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) return { ...emptyData(), ...(JSON.parse(raw) as Partial<GuestData>) };
    } catch {
        // corrupted or unavailable: fall through
    }
    return memory ?? emptyData();
}

export function saveGuestData(data: GuestData) {
    memory = data;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // quota exceeded or storage blocked: keep the in-memory copy
    }
}

export function updateGuestData(fn: (data: GuestData) => void): GuestData {
    const data = loadGuestData();
    fn(data);
    saveGuestData(data);
    return data;
}

export function clearGuestData() {
    memory = null;
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export function getGuestBot(id: string): GuestBot | undefined {
    return GUEST_BOTS.find((b) => b.id === id);
}

export function getGuestGame(id: string): GuestGame | undefined {
    return loadGuestData().games[id];
}

export function saveGuestGame(game: GuestGame) {
    updateGuestData((data) => {
        data.games[game.id] = game;
        // Keep storage bounded: drop the oldest finished games.
        const all = Object.values(data.games).sort((a, b) => b.createdAt - a.createdAt);
        for (const old of all.slice(MAX_GAMES)) {
            if (old.status === "FINISHED") delete data.games[old.id];
        }
    });
}

export function guestUser(data = loadGuestData()) {
    return {
        id: GUEST_USER_ID,
        name: data.profile.name,
        username: data.profile.username,
        displayUsername: data.profile.username,
        email: "",
        emailVerified: true,
        image: null as string | null,
        elo: data.elo,
        createdAt: new Date(data.createdAt).toISOString(),
    };
}

export function newGuestId() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
