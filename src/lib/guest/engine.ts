import { Chess } from "chess.js";
import type { GameState, Move, Player } from "@/app/types/game";
import { GUEST_USER_ID } from "@/lib/guest/mode";
import { GuestBot, GuestData, GuestGame, guestUser } from "@/lib/guest/store";

export const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Color = "w" | "b";

export function turnOf(fen: string): Color {
    return fen.split(" ")[1] === "b" ? "b" : "w";
}

const positionKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

/** Remaining time of both players at `now`, including the running clock. */
export function liveClocks(game: GuestGame, now = Date.now()) {
    let white = game.whiteTimeLeft;
    let black = game.blackTimeLeft;
    if (game.status === "IN_PROGRESS") {
        const elapsed = Math.max(0, now - game.lastMoveAt);
        if (turnOf(game.fen) === "w") {
            if (white != null) white = Math.max(0, white - elapsed);
        } else if (black != null) {
            black = Math.max(0, black - elapsed);
        }
    }
    return { white, black };
}

function finish(game: GuestGame, result: string, winnerId: string | null, zeroClockOf?: Color, now = Date.now()): GuestGame {
    return {
        ...game,
        status: "FINISHED",
        result,
        winnerId,
        finishedAt: now,
        whiteTimeLeft: zeroClockOf === "w" ? 0 : game.whiteTimeLeft,
        blackTimeLeft: zeroClockOf === "b" ? 0 : game.blackTimeLeft,
    };
}

const sideIds = (game: GuestGame) => ({
    white: game.humanColor === "w" ? GUEST_USER_ID : game.botId,
    black: game.humanColor === "b" ? GUEST_USER_ID : game.botId,
});

export interface GuestMoveResult {
    ok: boolean;
    /** The game after the call; differs from the input when something changed (move played or game ended on time). */
    game: GuestGame;
    error?: string;
}

/** Applies a move with the same rules as the server: turn, clock, legality, game-over detection. */
export function applyGuestMove(
    game: GuestGame,
    input: { from: string; to: string; promotion?: string },
    asBot: boolean,
    now = Date.now()
): GuestMoveResult {
    if (game.status !== "IN_PROGRESS") return { ok: false, game, error: "La partie n'est pas en cours" };

    const turn = turnOf(game.fen);
    if ((turn !== game.humanColor) !== asBot) return { ok: false, game, error: "Ce n'est pas votre tour" };

    const ids = sideIds(game);
    const clockKey = turn === "w" ? "whiteTimeLeft" : "blackTimeLeft";
    let timeLeft = game[clockKey];
    if (timeLeft != null) {
        timeLeft -= Math.max(0, now - game.lastMoveAt);
        if (timeLeft <= 0) {
            const winner = turn === "w" ? ids.black : ids.white;
            return { ok: false, game: finish(game, "TIMEOUT", winner, turn, now), error: "Temps écoulé" };
        }
    }

    const chess = new Chess(game.fen);
    let applied;
    try {
        applied = chess.move({ from: input.from, to: input.to, promotion: input.promotion });
    } catch {
        return { ok: false, game, error: "Coup invalide" };
    }

    const newFen = chess.fen();
    const move: Move = {
        from: applied.from,
        to: applied.to,
        promotion: applied.promotion,
        capturedPiece: applied.captured,
        fen: newFen,
        moveNumber: game.moves.length + 1,
        timestamp: new Date(now).toISOString(),
    };

    const captured = { white: [...game.capturedPieces.white], black: [...game.capturedPieces.black] };
    if (applied.captured) captured[turn === "w" ? "white" : "black"].push(applied.captured);

    let next: GuestGame = {
        ...game,
        fen: newFen,
        moves: [...game.moves, move],
        capturedPieces: captured,
        lastMoveAt: now,
        [clockKey]: timeLeft,
    };

    const moverId = turn === "w" ? ids.white : ids.black;
    if (chess.isCheckmate()) {
        next = finish(next, turn === "w" ? "WHITE_WIN" : "BLACK_WIN", moverId, undefined, now);
    } else if (chess.isStalemate()) {
        next = finish(next, "STALEMATE", null, undefined, now);
    } else if (chess.isInsufficientMaterial() || chess.isDrawByFiftyMoves()) {
        next = finish(next, "DRAW", null, undefined, now);
    } else {
        const key = positionKey(newFen);
        const seen = [INITIAL_FEN, ...game.moves.map((m) => m.fen)].filter((f) => positionKey(f) === key).length + 1;
        if (seen >= 3) next = finish(next, "REPETITION", null, undefined, now);
    }
    return { ok: true, game: next };
}

/** Ends the game on time when the clock of the side to move has run out. */
export function claimGuestTimeout(game: GuestGame, now = Date.now()): GuestGame {
    if (game.status !== "IN_PROGRESS") return game;
    const clocks = liveClocks(game, now);
    const turn = turnOf(game.fen);
    const remaining = turn === "w" ? clocks.white : clocks.black;
    if (remaining == null || remaining > 0) return game;
    const ids = sideIds(game);
    return finish(game, "TIMEOUT", turn === "w" ? ids.black : ids.white, turn, now);
}

export function guestPlayer(data: GuestData): Player {
    const u = guestUser(data);
    return { id: u.id, username: u.username, name: u.name, elo: u.elo };
}

/** Builds the same GameState shape the online game uses, so the game panels can be reused. */
export function toGameState(game: GuestGame, bot: GuestBot, data: GuestData): GameState {
    const human = guestPlayer(data);
    const clocks = liveClocks(game);
    return {
        id: game.id,
        code: "",
        status: game.status,
        result: game.result,
        winnerId: game.winnerId,
        currentFen: game.fen,
        moves: game.moves,
        capturedPieces: game.capturedPieces,
        playerWhite: game.humanColor === "w" ? human : undefined,
        playerBlack: game.humanColor === "b" ? human : undefined,
        bot,
        chatMessages: [],
        timeMode: game.timeMode,
        timeLimit: game.timeLimit,
        whiteTimeLeft: clocks.white,
        blackTimeLeft: clocks.black,
    };
}
