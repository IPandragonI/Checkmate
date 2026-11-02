import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest, unauthorized } from "@/app/api/utils/http";

export async function GET() {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const bots = await prisma.bot.findMany({ orderBy: { elo: "asc" } });
    return NextResponse.json(bots);
}
