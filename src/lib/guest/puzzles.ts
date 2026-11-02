import { CATEGORY_DEFINITIONS, PUZZLE_THEMES } from "@/app/types/game";
import type { GuestPuzzleProgress } from "@/lib/guest/store";

export interface GuestPuzzle {
    id: string;
    themes: string[];
    startFen: string;
    /** First move is the opponent's; the solver then alternates with the scripted replies. */
    solution: { from: string; to: string; promotion?: string }[];
    difficulty: number;
}

const line = (uci: string) =>
    uci.split(" ").map((m) => ({ from: m.slice(0, 2), to: m.slice(2, 4), ...(m[4] ? { promotion: m[4] } : {}) }));

/** Small bundled puzzle set so puzzles work without the database. */
export const GUEST_PUZZLES: GuestPuzzle[] = [
    {
        id: "g-scholar",
        themes: ["MATE", "MATE_IN1", "ATTACKING_F2_F7", "SHORT"],
        startFen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 5 3",
        solution: line("g8f6 h5f7"),
        difficulty: 1,
    },
    {
        id: "g-backrank",
        themes: ["MATE", "MATE_IN1", "BACK_RANK_MATE", "SHORT"],
        startFen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1",
        solution: line("g8h8 a1a8"),
        difficulty: 1,
    },
    {
        id: "g-queen-ending",
        themes: ["MATE", "MATE_IN1", "ENDGAME", "QUEEN_ENDGAME", "SHORT"],
        startFen: "7k/8/5K2/8/8/8/8/6Q1 b - - 0 1",
        solution: line("h8h7 g1g7"),
        difficulty: 1,
    },
    {
        id: "g-rook-ending",
        themes: ["MATE", "MATE_IN1", "ENDGAME", "ROOK_ENDGAME", "SHORT"],
        startFen: "7k/8/6K1/8/8/8/8/R7 b - - 0 1",
        solution: line("h8g8 a1a8"),
        difficulty: 1,
    },
    {
        id: "g-knight-fork",
        themes: ["FORK", "ADVANTAGE", "MIDDLEGAME"],
        startFen: "r3k3/7p/8/3N4/8/8/8/4K3 b - - 0 1",
        solution: line("h7h6 d5c7 e8f7 c7a8"),
        difficulty: 2,
    },
    {
        id: "g-promotion",
        themes: ["PROMOTION", "ADVANCED_PAWN", "ENDGAME", "ONE_MOVE"],
        startFen: "8/1P6/8/8/8/8/k7/2K5 b - - 0 1",
        solution: line("a2a3 b7b8q"),
        difficulty: 1,
    },
];

/**
 * Picks the next puzzle like the server does: an attempted-but-unsolved puzzle first,
 * then a puzzle never seen. Returns null when everything has been solved.
 */
export function pickNextGuestPuzzle(themeCategory: string | undefined, progress: Record<string, GuestPuzzleProgress>) {
    const keywords = CATEGORY_DEFINITIONS.find((c) => c.key === themeCategory)?.keywords ?? [];
    const valid = keywords.filter((k) => k in PUZZLE_THEMES);
    const inCategory = valid.length ? GUEST_PUZZLES.filter((p) => p.themes.some((t) => valid.includes(t))) : GUEST_PUZZLES;

    const unsolved = inCategory
        .filter((p) => progress[p.id] && !progress[p.id].solved)
        .sort((a, b) => progress[a.id].createdAt - progress[b.id].createdAt)[0];
    return unsolved ?? inCategory.find((p) => !progress[p.id]) ?? null;
}
