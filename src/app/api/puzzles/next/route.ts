import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/app/api/utils/auth";
import {CATEGORY_DEFINITIONS, PUZZLE_THEMES} from "@/app/types/game";
import prisma from "@/lib/prisma";
import type {Prisma, PuzzleTheme} from "@prisma/client";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const url = new URL(req.url);
    const themeCategory = url.searchParams.get('themeCategory') || undefined;
    const themes = CATEGORY_DEFINITIONS.find(c => c.key === themeCategory)?.keywords || [];
    const validThemeKeys = Object.keys(PUZZLE_THEMES);
    const validThemes = themes.filter(t => validThemeKeys.includes(t)) as PuzzleTheme[];
    const whereTheme: Prisma.UserPuzzleWhereInput = validThemes.length ? { puzzle: { themes: { hasSome: validThemes } } } : {};

    const userPuzzle = await prisma.userPuzzle.findFirst({
        where: { userId: user.id, ...whereTheme, solved: false },
        include: { puzzle: true },
        orderBy: { createdAt: 'asc' }
    });

    if (userPuzzle && userPuzzle.puzzle) {
        return NextResponse.json({
            puzzleId: userPuzzle.puzzle.id,
            themes: userPuzzle.puzzle.themes,
            startFen: userPuzzle.puzzle.startFen,
            difficulty: userPuzzle.puzzle.difficulty,
            solution: userPuzzle.puzzle.solution,
        }, { status: 200 });
    }

    const whereClause: Prisma.PuzzleWhereInput = {
        UserPuzzle: { none: { userId: user.id } }
    };
    if (themeCategory && validThemes.length) {
        whereClause.themes = { hasSome: validThemes };
    }

    const puzzle = await prisma.puzzle.findFirst({
        where: whereClause,
        orderBy: { createdAt: 'asc' }
    });
    if (!puzzle) return NextResponse.json({ error: "Aucun nouveau puzzle disponible" }, { status: 404 });

    await prisma.userPuzzle.upsert({
        where: { userId_puzzleId: { userId: user.id, puzzleId: puzzle.id } },
        update: {},
        create: { puzzleId: puzzle.id, userId: user.id },
    });

    return NextResponse.json({
        puzzleId: puzzle.id,
        themes: puzzle.themes,
        startFen: puzzle.startFen,
        difficulty: puzzle.difficulty,
        solution: puzzle.solution,
    }, { status: 200 });
}
