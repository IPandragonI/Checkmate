import React, {useEffect, useRef, useState} from "react";
import {ChatMessage} from "@/app/types/game";

interface GameChatProps {
    gameId: string;
    user: { id: string; name: string };
    messages: ChatMessage[];
    onMessageSent: (message: ChatMessage) => void;
}

const MAX_LENGTH = 500;

const GameChat: React.FC<GameChatProps> = ({gameId, user, messages, onMessageSent}) => {
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({block: "nearest"});
    }, [messages.length]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const message = input.trim();
        if (!message || sending) return;

        setSending(true);
        setError(null);
        try {
            const res = await fetch(`/api/games/${gameId}/chat`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({message}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Envoi impossible");
            onMessageSent(data.message);
            setInput("");
        } catch (err: any) {
            setError(err?.message || "Envoi impossible");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-2 p-2 bg-base-200 rounded flex-1 overflow-y-auto max-h-52">
                {messages.map((msg, idx) => (
                    <div key={msg.id ?? idx} className={`chat ${msg.userId === user.id ? "chat-end" : "chat-start"}`}>
                        <div className={`chat-bubble ${msg.userId === user.id ? "" : "chat-bubble-secondary"}`}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef}/>
            </div>
            {error && <div className="text-error text-xs mb-1">{error}</div>}
            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    className="flex-1 input input-bordered"
                    type="text"
                    value={input}
                    maxLength={MAX_LENGTH}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Votre message..."
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>Envoyer</button>
            </form>
        </div>
    );
};

export default GameChat;
