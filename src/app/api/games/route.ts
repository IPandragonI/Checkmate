import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fail, getUserFromRequest, unauthorized } from "@/app/api/utils/http";

/** Looks up a joinable game by its access code. Only exposes what is needed to join. */
export async function GET(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code || code.length > 16) return fail("Code requis");

    const game = await prisma.game.findUnique({ where: { code }, select: { id: true, status: true } });
    if (!game) return fail("Partie introuvable", 404);
    return NextResponse.json(game);
}
