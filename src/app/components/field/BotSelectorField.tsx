import {apiFetch} from "@/lib/api";
import React, { useState, useEffect } from "react";
import {Svg} from "@/app/utils/Svg";
import {Bot} from "@/app/types/game";

interface BotSelectorProps {
    botId: string;
    setBotId: (level: string) => void;
}

const BotSelectorField: React.FC<BotSelectorProps> = ({botId, setBotId}) => {
    const [hovered, setHovered] = useState<string | null>(null);
    const [bots, setBots] = useState<Bot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/api/bots")
            .then(res => res.json())
            .then(data => {
                setBots(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="form-control">
            <label className="label">Niveau du bot</label>
            {loading ? (
                <div className="mt-4 text-center text-sm text-gray-400">Chargement des bots...</div>
            ) : (
                <div className="grid grid-cols-4 gap-4 justify-items-center mt-4">
                    {bots.map(l => (
                        <div
                            key={l.id}
                            className={`relative card w-full shadow-sm p-2 items-center cursor-pointer transition hover:border-secondary ${botId === l.id ? "bg-secondary border-2 border-secondary" : "border"}`}
                            onClick={() => setBotId(l.id)}
                            tabIndex={0}
                            role="button"
                            aria-label={`Choisir le bot ${l.username} de niveau ${l.label}`}
                            onMouseEnter={() => setHovered(l.id)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(l.id)}
                            onBlur={() => setHovered(null)}
                        >
                            <figure className="h-10 flex items-center justify-center">
                                <Svg src={l.img} alt={l.username} width={26} height={26} className="mb-2"/>
                            </figure>
                            <div className="card-body p-0 justify-center items-center text-center">
                                <h2 className={`card-title text-sm ${botId === l.id ? "text-white" : ""}`}>{l.username}</h2>
                            </div>
                            {hovered === l.id && (
                                <div className="absolute z-20 left-1/2 -translate-x-1/2 -top-10 mt-2 px-3 py-2 rounded bg-base-100 shadow text-xs text-center border border-gray-200 whitespace-nowrap">
                                    <span className="font-semibold">{l.label}</span><br/>
                                    <span>Elo : {l.elo}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BotSelectorField;
