import {Chess} from "chess.js";
import {GameResult} from "@prisma/client";
import Swal from "sweetalert2";

export function getGameResult(chess: Chess): GameResult | null {
    const winner = chess.turn() === 'w' ? 'black' : 'white';
    if (chess.isCheckmate()) return winner === 'white' ? GameResult.WHITE_WIN : GameResult.BLACK_WIN;
    if (chess.isStalemate()) return GameResult.STALEMATE;
    if (chess.isThreefoldRepetition()) return GameResult.REPETITION;
    if (chess.isDraw() || chess.isInsufficientMaterial()) return GameResult.DRAW;
    return null;
}

export function getGameResultString(result: string): string {
    switch (result) {
        case GameResult.WHITE_WIN:
            return "Victoire des Blancs";
        case GameResult.BLACK_WIN:
            return "Victoire des Noirs";
        case GameResult.STALEMATE:
            return "Pat";
        case GameResult.REPETITION:
            return "Répétition";
        case GameResult.TIMEOUT:
            return "Temps écoulé";
        case GameResult.RESIGNATION:
            return "Abandon";
        default:
            return "Nulle";
    }
}

const DRAWN_RESULTS: string[] = [GameResult.DRAW, GameResult.STALEMATE, GameResult.REPETITION];

export interface GameOverHandlerProps {
    result: string;
    winnerName?: string | null;
    router: any;
}

export function handleGameOver({result, winnerName, router}: GameOverHandlerProps) {
    const resultString = getGameResultString(result);
    const winnerText = DRAWN_RESULTS.includes(result) ? 'Nulle' : winnerName || 'Inconnu';

    setTimeout(async () => {
        await Swal.fire({
            title: 'Partie terminée !',
            html: `<b>Résultat :</b> ${resultString}<br/><br/><b>Gagnant :</b> ${winnerText}`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Rejouer',
            cancelButtonText: 'Retour au menu',
        }).then((res) => {
            if (res.isConfirmed) {
                router.push("/games/create");
            } else if (res.isDismissed) {
                router.push("/");
            }
        });
    }, 1000);
}
