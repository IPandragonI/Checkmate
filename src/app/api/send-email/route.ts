import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const schema = z.object({
    subject: z.string().trim().min(3).max(150),
    text: z.string().trim().min(10).max(5000),
});

// Best-effort throttle (per server instance) to limit abuse of the contact form.
const COOLDOWN_MS = 30_000;
const lastSent = new Map<string, number>();

/** Contact form: sends a message to the site owner. The sender is the authenticated user (Reply-To only). */
export async function POST(req: Request) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const parsed = await parseJson(req, schema);
    if (!parsed.ok) return parsed.res;

    const now = Date.now();
    if (now - (lastSent.get(user.id) ?? 0) < COOLDOWN_MS) {
        return fail("Merci de patienter avant d'envoyer un nouveau message", 429);
    }
    lastSent.set(user.id, now);

    try {
        await sendEmail({
            subject: `[Checkmate] ${parsed.data.subject}`,
            text: `De : ${user.name} <${user.email}>\n\n${parsed.data.text}`,
            replyTo: user.email,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact email failed:", error);
        lastSent.delete(user.id);
        return fail("Erreur d'envoi d'email.", 500);
    }
}
