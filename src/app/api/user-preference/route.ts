import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const schema = z.object({ theme: z.string().regex(/^[a-z0-9_-]{1,32}$/, "Thème invalide") });

export async function GET() {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const preference = await prisma.userPreference.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ preference });
}

export async function POST(request: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const parsed = await parseJson(request, schema);
    if (!parsed.ok) return parsed.res;
    const { theme } = parsed.data;

    const preference = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: { theme },
        create: { userId: user.id, theme },
    });
    return NextResponse.json({ preference });
}
