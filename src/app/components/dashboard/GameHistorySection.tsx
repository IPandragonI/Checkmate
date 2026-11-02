import {getOutcomeForUser} from "@/app/games/utils/outcome";
import {timeModes} from "@/app/types/game";
import {Svg} from "@/app/utils/Svg";
import {GameResult} from "@prisma/client";
import {getTimeModeIcon} from "@/app/components/field/TimeModeField";

function GameHistorySection({gameHistory, user}: { gameHistory?: any[], user?: any }) {
    if (!gameHistory || gameHistory.length === 0) {
        return (
            <div className="bg-base-200 rounded-xl shadow p-6 h-full col-span-4 xl:col-span-3 row-span-2">
                <h2 className="text-lg font-bold mb-4">Historique des parties</h2>
                <p>Aucune partie jouée pour l'instant.</p>
            </div>
        );
    }
    return (
        <div className="bg-base-200 rounded-xl shadow p-6 h-full col-span-4 xl:col-span-3 row-span-2 max-h-[48rem]">
            <h2 className="text-lg font-bold mb-4">Historique des parties</h2>
            <div className="overflow-auto max-h-[26rem]">
                <table className="text-sm table text-center bg-base-100 min-w-full">
                <thead>
                <tr>
                    <th>Mode</th>
                    <th>Joueurs</th>
                    <th>Résultat</th>
                    <th>Coups</th>
                    <th>Date</th>
                </tr>
                </thead>
                <tbody>
                {gameHistory.slice(0, 10).map((game, idx) => {
                    const modeObj = timeModes.find(m => m.key === game.timeMode) || timeModes[0];
                    if (game.status !== 'FINISHED') return null;
                    const playerWhite = game.playerWhite ? game.playerWhite : game.bot;
                    const playerBlack = game.playerBlack ? game.playerBlack : game.bot;
                    const gameResultForUser = getOutcomeForUser(game, user?.id);
                    const modeIcon = getTimeModeIcon(modeObj.key);
                    return (
                        <tr key={game.id || idx}>
                            <td className="py-2 px-2">
                                <div className="flex items-center justify-center gap-2">
                                    {modeIcon}
                                    <span className="text-sm">{modeObj.label}</span>
                                </div>
                            </td>
                            <td className="py-2 px-2">
                                <div className="flex flex-col justify-center w-full gap-1">
                                    <div className="flex justify-center gap-2 w-full">
                                        <Svg src="/pieces/wP.svg" alt="Blanc" width={20} height={20}/>
                                        <span className={`${game.playerWhiteId === user?.id ? 'font-bold' : ''}`}>
                                            {playerWhite.username}
                                        </span>
                                        <p className="text-gray-500">
                                            ({playerWhite.elo})
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-2 w-full">
                                        <Svg src="/pieces/bP.svg" alt="Noir" width={20} height={20}/>
                                        <span className={`${game.playerBlackId === user?.id ? 'font-bold' : ''}`}>
                                            {playerBlack.username}
                                        </span>
                                        <p className="text-gray-500">
                                            ({playerBlack.elo})
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-2 px-2">
                                <div className="flex items-center justify-center">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                        ${gameResultForUser === 'WIN' ? 'bg-green-200 text-green-800' :
                                            gameResultForUser === 'LOSS' ? 'bg-red-200 text-red-800' :
                                                'bg-yellow-200 text-yellow-800'}`}>
                                        {gameResultForUser === 'WIN' ? 'Victoire' :
                                            gameResultForUser === 'LOSS' ? 'Défaite' : 'Nulle'}
                                    </span>
                                </div>
                            </td>
                            <td className="py-2 px-2">{game._count?.moves ?? game.moves?.length ?? 0}</td>
                            <td className="py-2 px-2">{game.finishedAt ? new Date(game.finishedAt).toLocaleDateString('fr-FR') : '-'}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        </div>
    );
}

export default GameHistorySection;