import Link from "next/link";
import {Svg} from "@/app/utils/Svg";
import {timeModes} from "@/app/types/game";

function GamesInProgressSection({gameHistory, user}: { gameHistory?: any[], user?: any }) {
    const gamesInProgress = (gameHistory || []).filter(g => g.status == 'IN_PROGRESS' && (g.playerWhiteId === user?.id || g.playerBlackId === user?.id));

    if (!gamesInProgress.length) {
        return (
            <div className="col-span-4 xl:col-span-1 row-span-2 bg-base-200 rounded-xl shadow p-6 h-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-bold mb-2">Parties en cours</h2>
                    <p>Aucune partie en cours.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="col-span-4 xl:col-span-1 row-span-2 bg-base-200 rounded-xl shadow p-6 h-full overflow-y-auto max-h-[48rem]">
            <h2 className="text-lg font-bold mb-4">Parties en cours</h2>
            <ul className="space-y-4 overflow-y-auto">
                {gamesInProgress.map((game) => {
                    const isWhite = game.playerWhiteId === user?.id;
                    let opponent = isWhite ? game.playerBlack : game.playerWhite;
                    if (!opponent) opponent = game.bot;
                    const couleur = isWhite ? 'Blanc' : 'Noir';
                    return (
                        <li key={game.id} className="flex flex-col gap-2 p-3 rounded-xl bg-base-100 shadow">
                            <div className="flex justify-between items-center xl:flex-col xl:items-start">
                                <span className="text-xs text-gray-500">{game.createdAt ? new Date(game.createdAt).toLocaleDateString('fr-FR') : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex justify-center gap-2 w-full items-center">
                                    <Svg src={`${!isWhite ? '/pieces/wP.svg' : '/pieces/bP.svg'}`} alt={couleur} width={20} height={20}/>
                                    <span className="xl:text-xs">{opponent?.username}</span>
                                    <p className="xl:text-xs text-gray-500">({opponent?.elo})</p>
                                </div>
                            </div>
                            <Link href={game.guest ? `/games/guest/${game.id}` : `/games/${game.id}`} className="btn btn-primary btn-sm w-full mt-2">Rejoindre</Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default GamesInProgressSection;