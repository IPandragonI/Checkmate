import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/server/services/gameServices";
import { publishGameEvents } from "@/lib/pusher-server";
import { fail, getUserFromRequest, unauthorized } from "@/app/api/utils/http";

export async function POST(_req: NextRequest, context: { params: Promise<{ gameId: string }> }) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const { gameId } = await context.params;
    const result = await GameService.joinGame(gameId, user.id);
    if (!result.ok) return fail(result.error, result.status);

    if (result.started) {
        await publishGameEvents(gameId, [{ name: "start", data: { gameState: result.game } }]);
    }
    return NextResponse.json({ game: result.game });
}
