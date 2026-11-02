import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { GameService } from "@/server/services/gameServices";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const ALLOWED_MINUTES = [1, 3, 5, 10, 15, 30, 60];

const schema = z.object({
    mode: z.enum(["online", "bot"]),
    color: z.enum(["white", "black", "random"]).default("random"),
    timeMode: z
        .string()
        .transform((v) => v.toUpperCase())
        .pipe(z.enum(["BULLET", "BLITZ", "RAPID", "CLASSICAL"]))
        .default("RAPID"),
    timeLimit: z.union([z.string(), z.number()]).nullish(),
    botId: z.string().min(1).max(64).optional(),
});

export async function POST(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const parsed = await parseJson(req, schema);
    if (!parsed.ok) return parsed.res;
    const { mode, color, timeMode, timeLimit, botId } = parsed.data;

    let timeLimitMs: number | null = null;
    if (timeLimit !== undefined && timeLimit !== null && timeLimit !== "") {
        const minutes = Number(timeLimit);
        if (!ALLOWED_MINUTES.includes(minutes)) return fail("Durée invalide");
        timeLimitMs = minutes * 60_000;
    }

    if (mode === "bot") {
        if (!botId) return fail("botId requis pour le mode bot");
        const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { id: true } });
        if (!bot) return fail("Bot inexistant");
    }

    try {
        const game = await GameService.createGame(user.id, { mode, color, timeLimitMs, timeMode, botId });
        return NextResponse.json({ gameId: game.id, code: game.code });
    } catch (error) {
        console.error("Error creating game:", error);
        return fail("Erreur serveur", 500);
    }
}
