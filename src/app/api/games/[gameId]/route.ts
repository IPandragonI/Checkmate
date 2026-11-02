import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/server/services/gameServices";
import { fail, getUserFromRequest, unauthorized } from "@/app/api/utils/http";

/** Current state of a game (used by clients to resynchronise). Participants only. */
export async function GET(_req: NextRequest, context: { params: Promise<{ gameId: string }> }) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const { gameId } = await context.params;
    if (!(await GameService.isParticipant(gameId, user.id))) return fail("Partie introuvable", 404);

    const game = await GameService.getGameState(gameId);
    if (!game) return fail("Partie introuvable", 404);
    return NextResponse.json({ game });
}
