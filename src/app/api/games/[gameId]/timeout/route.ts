import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/server/services/gameServices";
import { publishGameEvents } from "@/lib/pusher-server";
import { fail, getUserFromRequest, unauthorized } from "@/app/api/utils/http";

/** Ends the game on time. The server verifies that the clock really ran out. */
export async function POST(_req: NextRequest, context: { params: Promise<{ gameId: string }> }) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const { gameId } = await context.params;
    if (!(await GameService.isParticipant(gameId, user.id))) return fail("Partie introuvable", 404);

    const result = await GameService.claimTimeout(gameId);
    if (!result.ok) return fail(result.error, result.status);

    await publishGameEvents(gameId, [{ name: "gameOver", data: result.gameOver }]);
    return NextResponse.json({ gameOver: result.gameOver });
}
