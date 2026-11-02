import {apiFetch} from "@/lib/api";
import {useSession} from "@/lib/auth-client";
import FullScreenLoader from "@/app/utils/FullScreenLoader";
import {useEffect, useState} from "react";
import TopSection from "@/app/components/dashboard/TopSection";
import EloSection from "@/app/components/dashboard/EloSection";
import GameHistorySection from "@/app/components/dashboard/GameHistorySection";
import StatisticsSection from "@/app/components/dashboard/StatisticsSection";
import GamesInProgressSection from "@/app/components/dashboard/GamesInProgressSection";
import Topbar from "@/app/components/ui/Topbar";
import EloEvolutionSection from "@/app/components/dashboard/EloEvolutionSection";
import Footer from "@/app/components/ui/Footer";

const Dashboard = () => {
    const {data: session, isPending} = useSession();
    const [user, setUser] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);
    const [ratingHistory, setRatingHistory] = useState([]);
    const [puzzleHistory, setPuzzleHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.user?.id) return;
        setLoading(true);
        apiFetch('/api/user')
            .then(res => res.json())
            .then(data => {
                setUser(data.user);
                setGameHistory(data.gameHistory);
                setRatingHistory(data.ratingHistory);
                setPuzzleHistory(data.puzzleHistory);
                setLoading(false);
            });
    }, [session?.user?.id]);

    if (isPending || !session?.user) return <FullScreenLoader/>;
    if (loading) return <FullScreenLoader/>;

    return (
        <div className="w-full h-full min-h-screen flex flex-col">
            <Topbar/>

            <div className="w-full h-full p-4 flex flex-col gap-6">
                <h1 className="text-xl xl:text-4xl font-bold tracking-wider text-primary">Bienvenue sur Checkmate</h1>
                {/* Bandeau principal en haut */}
                <div className="w-full grid lg:grid-cols-[3fr_1fr] grid-cols-1 gap-6">
                    <TopSection user={user}/>
                    <EloSection user={user}/>
                </div>

                {/* Section principale en dessous */}
                <div className="w-full grid lg:grid-cols-[3fr_1fr] grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4">
                        <GameHistorySection gameHistory={gameHistory} user={user}/>
                        <GamesInProgressSection gameHistory={gameHistory} user={user}/>

                        <div className="col-span-4 row-span-1 lg:hidden block">
                            <StatisticsSection gameHistory={gameHistory} user={user} puzzleHistory={puzzleHistory}/>
                        </div>
                    </div>
                    {/* Colonne de blocs à droite (visible seulement sur pc) */}
                    <div className="flex flex-col gap-4 lg:block hidden">
                        <StatisticsSection gameHistory={gameHistory} user={user} puzzleHistory={puzzleHistory}/>
                    </div>
                </div>

                <div className="w-full grid grid-cols-1">
                    <EloEvolutionSection ratingHistory={ratingHistory}/>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default Dashboard;
