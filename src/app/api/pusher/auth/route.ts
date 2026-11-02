import { NextRequest, NextResponse } from "next/server";
import { getPusher } from "@/lib/pusher-server";
import { GameService } from "@/server/services/gameServices";
import { fail, getUserFromRequest, unauthorized } from "@/app/api/utils/http";

const CHANNEL_PATTERN = /^private-game-([A-Za-z0-9-]{1,64})$/;
const SOCKET_ID_PATTERN = /^\d+\.\d+$/;

/** Authorizes a Pusher private-channel subscription: only the players of a game may listen to it. */
export async function POST(req: NextRequest) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const form = await req.formData().catch(() => null);
    const socketId = String(form?.get("socket_id") ?? "");
    const channelName = String(form?.get("channel_name") ?? "");

    const match = CHANNEL_PATTERN.exec(channelName);
    if (!match || !SOCKET_ID_PATTERN.test(socketId)) return fail("Requête invalide");
    if (!(await GameService.isParticipant(match[1], user.id))) return fail("Accès refusé", 403);

    return NextResponse.json(getPusher().authorizeChannel(socketId, channelName));
}
