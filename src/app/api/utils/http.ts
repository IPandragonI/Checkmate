import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/app/api/utils/auth";

export const unauthorized = () => NextResponse.json({ error: "Non authentifié" }, { status: 401 });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type Parsed<T> = { ok: true; data: T } | { ok: false; res: NextResponse };

export async function parseJson<T>(req: NextRequest | Request, schema: z.ZodType<T>): Promise<Parsed<T>> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return { ok: false, res: fail("Payload invalide") };
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
        return { ok: false, res: fail(result.error.issues[0]?.message || "Payload invalide") };
    }
    return { ok: true, data: result.data };
}

export { getUserFromRequest };
