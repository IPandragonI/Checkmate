const DRAWN_RESULTS = ["DRAW", "STALEMATE", "REPETITION"];

/** Outcome of a finished game from the point of view of `userId`. */
export function getOutcomeForUser(game: { result?: string | null; winnerId?: string | null; playerWhiteId?: string | null; playerBlackId?: string | null }, userId?: string): "WIN" | "LOSS" | "DRAW" {
    if (!game.result || DRAWN_RESULTS.includes(game.result)) return "DRAW";
    if (game.winnerId) return game.winnerId === userId ? "WIN" : "LOSS";
    // Legacy rows without a winner
    if (game.result === "WHITE_WIN") return game.playerWhiteId === userId ? "WIN" : "LOSS";
    if (game.result === "BLACK_WIN") return game.playerBlackId === userId ? "WIN" : "LOSS";
    return "DRAW";
}
