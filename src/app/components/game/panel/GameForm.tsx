"use client";

import BotSelector from "@/app/components/field/BotSelectorField";
import {useState} from "react";
import Swal from "sweetalert2";
import {useRouter} from "next/navigation";
import GameModeField from "@/app/components/field/GameModeField";
import StartColorField from "@/app/components/field/StartColorField";
import TimeModeField from "@/app/components/field/TimeModeField";
import { timeModes } from '@/app/types/game';

const GameForm = () => {
    const [mode, setMode] = useState("online");
    const [color, setColor] = useState("white");
    const [timeLimit, setTimeLimit] = useState("10");
    const [loading, setLoading] = useState(false);
    const [botId, setBotId] = useState("");
    const [timeMode, setTimeMode] = useState("RAPID");
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: any = {
                mode,
                color,
                timeLimit,
                timeMode,
            };
            if (mode === "bot") {
                payload.botId = botId;
            }
            const res = await fetch("/api/games/create", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.gameId) throw new Error(data.error || "Erreur lors de la création de la partie");
            router.push(`/games/${data.gameId}`);
            if (mode === "online") {
                try {
                    await navigator.clipboard.writeText(data.code);
                    await Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: "Code de la partie copié",
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                    });
                } catch (e: any) {}
            }
        } catch (err: any) {
            await Swal.fire({
                icon: "error",
                title: "Erreur",
                text: err.message,
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="flex flex-col justify-between h-full" onSubmit={handleSubmit}>
            <div className={"flex flex-col gap-6"}>
                <h1 className="text-3xl font-bold text-center">Nouvelle partie</h1>
                <GameModeField mode={mode} onClick={() => setMode("online")} onClick1={() => setMode("bot")}/>
                {mode === "bot" && (
                    <>
                        <BotSelector botId={botId} setBotId={setBotId}/>
                    </>
                )}
                <StartColorField color={color} onClick={() => setColor("white")} onClick1={() => setColor("black")} onClick2={() => setColor("random")}/>
                <TimeModeField value={timeLimit} mode={mode} timeMode={timeMode} onChange={e => setTimeLimit(e.target.value)}
                               setTimeMode={(newMode: string) => {
                                   setTimeMode(newMode);
                                   const tm = timeModes.find(m => m.key === newMode) || timeModes[0];
                                   const defaultValue = tm.options[0]?.value || "10";
                                   setTimeLimit(defaultValue);
                               }}/>
            </div>
            <div>
                <button className={`btn ${mode === 'bot' ? 'btn-secondary' : 'btn-primary'} w-full`} type="submit" disabled={loading || (mode === "bot" && !botId)}>
                    {loading ? <span className="loading loading-spinner loading-sm mr-2"></span> : null}
                    Créer la partie
                </button>
            </div>
        </form>
    );
}

export default GameForm;