import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GameService } from "@/server/services/gameServices";
import { publishGameEvents, type GameEvent } from "@/lib/pusher-server";
import { fail, getUserFromRequest, parseJson, unauthorized } from "@/app/api/utils/http";

const square = z.string().regex(/^[a-h][1-8]$/, "Case invalide");
const schema = z.object({
    from: square,
    to: square,
    promotion: z.enum(["q", "r", "b", "n"]).nullish().transform((v) => v ?? undefined),
    asBot: z.boolean().optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ gameId: string }> }) {
    const user = await getUserFromRequest();
    if (!user?.id) return unauthorized();

    const { gameId } = await context.params;
    const parsed = await parseJson(req, schema);
    if (!parsed.ok) return parsed.res;

    try {
        const result = await GameService.applyMove(gameId, user.id, parsed.data);

        if (!result.ok) {
            if (result.gameOver && !result.isBotGame) {
                await publishGameEvents(gameId, [{ name: "gameOver", data: result.gameOver }]);
            }
            return NextResponse.json({ error: result.error, gameOver: result.gameOver }, { status: result.status });
        }

        if (!result.isBotGame) {
            const events: GameEvent[] = [{ name: "move", data: result.move }];
            if (result.gameOver) events.push({ name: "gameOver", data: result.gameOver });
            await publishGameEvents(gameId, events);
        }
        return NextResponse.json({ move: result.move, gameOver: result.gameOver });
    } catch (error) {
        console.error("Error applying move:", error);
        return fail("Erreur serveur", 500);
    }
}
