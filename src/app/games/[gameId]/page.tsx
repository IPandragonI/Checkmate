import React from "react";
import {redirect} from "next/navigation";
import {GameBoard} from "@/app/games/[gameId]/gameBoardClient";
import {GameService} from "@/server/services/gameServices";
import {getUserFromRequest} from "@/app/api/utils/auth";

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    if (!gameId) {
        return <div className="p-8 text-center text-red-500">Paramètre de partie manquant</div>;
    }

    const user = await getUserFromRequest();
    if (!user) redirect("/auth/login-or-register");

    const game = await GameService.getGameState(gameId);
    if (!game) {
        return <div className="p-8 text-center text-red-500">Partie introuvable</div>;
    }

    // A game in progress or finished is private to its players; a waiting game can be joined by anyone with the link.
    const isPlayer = game.playerWhite?.id === user.id || game.playerBlack?.id === user.id;
    if (!isPlayer && game.status !== "WAITING") {
        return <div className="p-8 text-center text-red-500">Vous n&apos;êtes pas joueur de cette partie</div>;
    }

    // Do not leak the other player's data or the chat to someone who has not joined yet.
    const initialGame = isPlayer
        ? game
        : {...game, moves: [], chatMessages: [], playerWhite: undefined, playerBlack: undefined};

    return <GameBoard initialGame={initialGame} />;
}
