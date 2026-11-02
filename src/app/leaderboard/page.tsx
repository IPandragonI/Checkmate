"use client";

import {useSession} from "@/lib/auth-client";
import FullScreenLoader from "@/app/utils/FullScreenLoader";
import {useEffect, useState} from "react";
import {Dices, Joystick} from "lucide-react";
import Footer from "@/app/components/ui/Footer";

export default function LeaderboardPage() {
    const {data: session, isPending} = useSession();
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [gamesToday, setGamesToday] = useState(0);
    const [gamesInProgress, setGamesInProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [totalPlayers, setTotalPlayers] = useState(0);

    useEffect(() => {
        if (!session?.user?.id) return;
        setLoading(true);
        fetch('/api/leaderboard')
            .then(res => res.json())
            .then(data => {
                setUser(data.user);
                setUsers(data.users);
                setGamesToday(data.counts.gamesToday);
                setGamesInProgress(data.counts.inProgress);
                setTotalPlayers(data.counts.players);
                setLoading(false);
            });
    }, [session?.user?.id]);

    if (isPending || !session?.user) return <FullScreenLoader/>;
    if (loading) return <FullScreenLoader/>;

    return (
        <main className="p-6 space-y-4 text-base-content">
            <h1 className="text-3xl font-bold mb-10">Classement</h1>
            <div className="flex flex-col lg:flex-row w-full justify-between items-center gap-8 bg-base-200 rounded-xl shadow p-6 h-full overflow-x-auto">

                <section className="w-full lg:w-1/5 h-full">
                    <div className="stats stats-horizontal lg:stats-vertical shadow bg-base-100">
                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"
                                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                     stroke-linejoin="round"
                                     className="lucide lucide-chess-pawn-icon lucide-chess-pawn">
                                    <path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>
                                    <path d="m14.5 10 1.5 8"/>
                                    <path d="M7 10h10"/>
                                    <path d="m8 18 1.5-8"/>
                                    <circle cx="12" cy="6" r="4"/>
                                </svg>
                            </div>
                            <div className="stat-title">Nombre de joueurs</div>
                            <div className="stat-value">{totalPlayers}</div>
                            <div className="stat-desc">↗︎ 12 (4%)</div>
                        </div>

                        <div className="stat">
                            <div className="stat-figure text-secondary">
                                <Dices size={32} className="inline-block"/>
                            </div>
                            <div className="stat-title">Parties aujourd'hui</div>
                            <div className="stat-value text-secondary">{gamesToday}</div>
                            <div className="stat-desc">↗︎ 400 (22%)</div>
                        </div>

                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <Joystick size={32} className="inline-block"/>
                            </div>
                            <div className="stat-title">Parties en cours</div>
                            <div className="stat-value">{gamesInProgress}</div>
                            <div className="stat-desc">↘︎ 90 (14%)</div>
                        </div>
                    </div>
                </section>

                <section className="w-full lg:w-4/5 h-full overflow-x-auto">
                    <table className="table text-sm text-center bg-base-100">
                    <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Nom d'utilisateur</th>
                        <th>Élo</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.map((u: any, index) => (
                        <tr key={u.id}>
                            <td>
                                {index < 3 ? (
                                    <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm ` +
                                        (index === 0 ? 'bg-yellow-300 text-yellow-800' : index === 1 ? 'bg-gray-300 text-gray-800' : 'bg-amber-300 text-amber-800')}
                                    >
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        <span className="ml-2">{index + 1}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm">{index + 1}</span>
                                )}
                            </td>
                            <td className="flex items-center gap-2">
                                <div className="avatar placeholder">
                                    <div
                                        className="bg-neutral-focus w-8 h-8 flex items-center justify-center text-base-content rounded-full">
                                        {u.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={u.image} alt="User Avatar"
                                                 className="rounded-full object-cover"/>
                                        ) : (
                                            <span>
                                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span>{u.username}</span>
                            </td>
                            <td className="font-mono font-bold">{u.elo}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </section>
            </div>
            <Footer />
        </main>
    );
}