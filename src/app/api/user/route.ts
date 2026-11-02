import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const PUBLIC_PLAYER = { id: true, name: true, username: true, elo: true, createdAt: true } as const;

export async function GET() {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const [completeUser, gameHistory, ratingHistoryDesc, puzzleHistory] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id } }),
        prisma.game.findMany({
            where: { OR: [{ playerWhiteId: user.id }, { playerBlackId: user.id }] },
            include: {
                playerWhite: { select: PUBLIC_PLAYER },
                playerBlack: { select: PUBLIC_PLAYER },
                bot: true,
                _count: { select: { moves: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
        prisma.ratingHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
        prisma.userPuzzle.findMany({
            where: { userId: user.id },
            include: { puzzle: true },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ]);

    return NextResponse.json({
        user: completeUser,
        gameHistory,
        ratingHistory: ratingHistoryDesc.reverse(),
        puzzleHistory,
    });
}

const patchSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    username: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_.-]{3,30}$/, "Nom d'utilisateur invalide (3-30 caractères : lettres, chiffres, _ . -)")
        .optional(),
    image: z
        .string()
        .max(500)
        .regex(/^(\/[\w./-]*|https:\/\/[^\s]+)$/, "Image invalide")
        .optional(),
});

export async function PATCH(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const parsed = await parseJson(req, patchSchema);
    if (!parsed.ok) return parsed.res;
    const { name, username, image } = parsed.data;

    try {
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(username !== undefined ? { username } : {}),
                ...(image !== undefined ? { image } : {}),
            },
        });
        return NextResponse.json({ user: updated });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return fail("Nom d'utilisateur déjà pris", 409);
        }
        console.error("Erreur mise à jour utilisateur:", error);
        return fail("Erreur lors de la mise à jour du profil", 500);
    }
}
