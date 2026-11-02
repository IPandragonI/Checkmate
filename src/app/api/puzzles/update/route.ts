import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const schema = z.object({ puzzleId: z.string().min(1).max(64), solved: z.boolean() });

export async function POST(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const parsed = await parseJson(req, schema);
    if (!parsed.ok) return parsed.res;
    const { puzzleId, solved } = parsed.data;

    const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId }, select: { id: true } });
    if (!puzzle) return fail("Puzzle introuvable", 404);

    await prisma.userPuzzle.upsert({
        where: { userId_puzzleId: { userId: user.id, puzzleId } },
        update: { attempts: { increment: 1 }, solved, lastAttemptAt: new Date() },
        create: { userId: user.id, puzzleId, attempts: 1, solved, lastAttemptAt: new Date() },
    });

    return NextResponse.json({ success: true });
}
