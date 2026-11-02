import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CHAT_MAX_LENGTH, GameService } from "@/server/services/gameServices";
import { publishGameEvents } from "@/lib/pusher-server";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const schema = z.object({ message: z.string().trim().min(1, "Message vide").max(CHAT_MAX_LENGTH, "Message trop long") });

export async function POST(req: NextRequest, context: { params: Promise<{ gameId: string }> }) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const { gameId } = await context.params;
    const parsed = await parseJson(req, schema);
    if (!parsed.ok) return parsed.res;

    const message = await GameService.postChatMessage(gameId, user.id, parsed.data.message);
    if (!message) return fail("Partie introuvable", 404);

    await publishGameEvents(gameId, [{ name: "message", data: message }]);
    return NextResponse.json({ message });
}
