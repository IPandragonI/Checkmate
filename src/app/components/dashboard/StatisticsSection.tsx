import {Award, Heart, Swords, Puzzle} from "lucide-react";
import {getOutcomeForUser} from "@/app/games/utils/outcome";
import {timeModes, PUZZLE_THEMES} from "@/app/types/game";

function StatisticsSection({gameHistory, user, puzzleHistory}: {
    gameHistory: any[],
    user?: any,
    puzzleHistory: any[]
}) {
    const totalGames = gameHistory.filter(g => g.status === "FINISHED").length;
        const finished = gameHistory.filter(g => g.status === "FINISHED");
    const wins = finished.filter(g => getOutcomeForUser(g, user?.id) === "WIN").length;
    const losses = finished.filter(g => getOutcomeForUser(g, user?.id) === "LOSS").length;
    const draws = finished.filter(g => getOutcomeForUser(g, user?.id) === "DRAW").length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0"
    const favoriteMode = gameHistory
        .filter(g => g.status === "FINISHED" && (g.playerWhiteId === user?.id || g.playerBlackId === user?.id))
        .reduce((acc, game) => {
            acc[game.timeMode] = (acc[game.timeMode] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);


    const favoriteModeKey = Object.keys(favoriteMode).reduce((a, b) => favoriteMode[a] > favoriteMode[b] ? a : b, "");
    const favoriteModeLabel = timeModes.find(m => m.key === favoriteModeKey)?.label || "N/A";
    const favoriteModeCount = favoriteMode[favoriteModeKey] || 0;

    const puzzlesSolved = puzzleHistory?.length > 0 ? puzzleHistory.filter(p => p.solved).length : 0;
    const favoritePuzzleTheme = Array.isArray(puzzleHistory) && puzzleHistory.length > 0
        ? puzzleHistory.reduce((acc, pu) => {
            (pu?.puzzle?.themes || []).forEach((theme: string) => {
                if (pu.solved) {
                    acc[theme] = (acc[theme] || 0) + 1;
                }
            });
            return acc;
        }, {} as Record<string, number>)
        : {} as Record<string, number>;
    const favoritePuzzleThemeKey = Object.keys(favoritePuzzleTheme).reduce((a, b) => favoritePuzzleTheme[a] > favoritePuzzleTheme[b] ? a : b, "");
    const favoritePuzzleThemeLabel = PUZZLE_THEMES[favoritePuzzleThemeKey] || "N/A";
    const favoritePuzzleThemeCount = favoritePuzzleTheme[favoritePuzzleThemeKey] || 0;

    return (
        <div className="bg-base-200 rounded-xl shadow p-6 h-full xl:max-h-[48rem]">
            <h2 className="text-lg font-bold mb-4">Statistiques</h2>
            <ul className="list rounded-box">
                <li className="list-row">
                    <Swords size={24} className="text-primary"/>
                    <div>
                        <div>Parties jouées</div>
                        <div className="text-xs uppercase font-semibold opacity-60">Total des parties</div>
                    </div>
                    <span className="">
                        <span className="text-lg font-bold">{totalGames}</span>
                    </span>
                </li>
                <li className="list-row">
                    <Puzzle size={24} className="text-secondary"/>
                    <div>
                        <div>Problèmes résolus</div>
                        <div className="text-xs uppercase font-semibold opacity-60">Total résolus</div>
                    </div>
                    <span className="">
                        <span className="text-lg font-bold">{puzzlesSolved}</span>
                    </span>
                </li>
                <li className="list-row">
                    <Award size={24} className="text-tertiary"/>
                    <div>
                        <div>Win rate</div>
                        <div className="text-xs uppercase font-semibold opacity-60">Pourcentage de victoires</div>
                    </div>
                    <span className="">
                        <span className="text-lg font-bold">{winRate}%</span>
                    </span>
                </li>
            </ul>

            <span className="divider"></span>
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100">
                <div className="stat">
                    <div className="stat-title">Victoires</div>
                    <div className="stat-value">{totalGames}</div>
                </div>

                <div className="stat">
                    <div className="stat-title">Défaites</div>
                    <div className="stat-value">{losses}</div>
                </div>

                <div className="stat">
                    <div className="stat-title">Nuls</div>
                    <div className="stat-value">{draws}</div>
                </div>
            </div>

            <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100 mt-4">
                <div className="stat">
                    <div className="stat-figure text-primary">
                        <Heart size={32} className="inline-block" fill="currentColor"/>
                    </div>
                    <div className="stat-title">Mode préféré</div>
                    <div className="stat-value text-primary">{favoriteModeLabel || "N/A"}</div>
                    <div className="stat-desc">{favoriteModeCount} parties jouées</div>
                </div>
            </div>

            <span className="divider"></span>
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-100 mt-4">
                <div className="stat">
                    <div className="stat-figure text-secondary">
                        <Heart size={32} className="inline-block" fill="currentColor"/>
                    </div>
                    <div className="stat-title">Thème préféré</div>
                    <div className="stat-value text-secondary">{favoritePuzzleThemeLabel}</div>
                    <div className="stat-desc">{favoritePuzzleThemeCount} problèmes résolus</div>
                </div>
            </div>
        </div>
    );
}

export default StatisticsSection;