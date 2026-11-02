import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/app/api/utils/http";

const LEADERBOARD_SIZE = 100;

export async function GET() {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [completeUser, users, totalPlayers, gamesToday, inProgress] = await Promise.all([
        prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, name: true, username: true, email: true, elo: true, image: true, createdAt: true },
        }),
        prisma.user.findMany({
            select: { id: true, name: true, username: true, elo: true, image: true, createdAt: true },
            orderBy: [{ elo: "desc" }, { createdAt: "asc" }],
            take: LEADERBOARD_SIZE,
        }),
        prisma.user.count(),
        prisma.game.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.game.count({ where: { status: "IN_PROGRESS" } }),
    ]);

    return NextResponse.json({
        user: completeUser,
        users,
        counts: { gamesToday, inProgress, players: totalPlayers },
    });
}
