"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, Square } from "chess.js";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { gameChannelName, getPusherClient } from "@/lib/pusher-client";
import ChessboardWrapper from "@/app/components/chessBoard/ChessboardWrapper";
import GameInfos from "@/app/components/game/panel/GameInfos";
import GameWaiting from "@/app/components/game/panel/GameWaiting";
import GameLayout from "@/app/components/game/GameLayout";
import { ChatMessage, GameOverEvent, GameState, Move, MoveEvent, StartEvent } from "@/app/types/game";
import Swal from "sweetalert2";
import { handleGameOver } from "@/app/games/utils/gameUtils";
import { AudioController, createAudioController } from "@/lib/audio";

interface GameBoardProps {
    initialGame: GameState;
}

type Color = "w" | "b";
type Clocks = { white: number | null; black: number | null };

const CLOCK_TICK_MS = 250;
const POLL_INTERVAL_MS = 5000;
const MAX_BOT_RETRIES = 3;

function turnOf(fen: string): Color {
    return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Returns the state with the move applied; a no-op when the move is already known (echo of our own move). */
function withMove(prev: GameState, move: Move): GameState {
    if (prev.moves.some((m) => m.moveNumber === move.moveNumber)) return prev;
    const captured = prev.capturedPieces;
    const mover = turnOf(prev.currentFen);
    return {
        ...prev,
        currentFen: move.fen,
        moves: [...prev.moves, move],
        capturedPieces: move.capturedPiece
            ? {
                white: mover === "w" ? [...captured.white, move.capturedPiece] : captured.white,
                black: mover === "b" ? [...captured.black, move.capturedPiece] : captured.black,
            }
            : captured,
    };
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const GameBoard: React.FC<GameBoardProps> = ({ initialGame }) => {
    const { data: session } = useSession();
    const user = session?.user;
    const router = useRouter();

    const [gameState, setGameState] = useState<GameState>(initialGame);
    const [clocks, setClocks] = useState<Clocks>({ white: initialGame.whiteTimeLeft, black: initialGame.blackTimeLeft });
    const [resetKey, setResetKey] = useState(0);
    const [botFailures, setBotFailures] = useState(0);

    // The ref is the source of truth for event handlers; the state mirrors it for rendering.
    const gameStateRef = useRef<GameState>(initialGame);
    const chessRef = useRef(new Chess(initialGame.currentFen));
    const audioCtrlRef = useRef<AudioController | null>(null);
    const announcedRef = useRef(false);
    const gameOverShownRef = useRef(false);
    const joinRequestedRef = useRef(false);
    const timeoutClaimedRef = useRef(false);
    const postQueueRef = useRef<Promise<void>>(Promise.resolve());

    const isBotGame = !!initialGame.bot;
    const isOnlineGame = !isBotGame;
    const gameId = initialGame.id;
    const initiallyFinished = initialGame.status === "FINISHED";

    const turn = turnOf(gameState.currentFen);
    const myColor: Color | null =
        user?.id && gameState.playerWhite?.id === user.id ? "w"
            : user?.id && gameState.playerBlack?.id === user.id ? "b"
                : null;
    const isParticipant = myColor !== null;
    const inProgress = gameState.status === "IN_PROGRESS";
    const canPlay = inProgress && myColor === turn;
    const isBotTurn = isBotGame && inProgress && myColor !== null && turn !== myColor && botFailures < MAX_BOT_RETRIES;
    const orientation: "white" | "black" = myColor === "b" ? "black" : "white";
    const hasClock = clocks.white != null || clocks.black != null;

    const updateGame = useCallback((fn: (prev: GameState) => GameState) => {
        const next = fn(gameStateRef.current);
        gameStateRef.current = next;
        setGameState(next);
    }, []);

    useEffect(() => {
        try {
            audioCtrlRef.current = createAudioController();
        } catch (e) {
            console.warn("Audio init failed", e);
        }
        return () => {
            try {
                audioCtrlRef.current?.dispose();
                audioCtrlRef.current = null;
            } catch {
                // ignore
            }
        };
    }, []);

    const playSound = useCallback((move: Move, startOrEnd?: string) => {
        try {
            const isCheck = chessRef.current.isCheck();
            const isCastle =
                chessRef.current.get(move.to as Square)?.type === "k" &&
                (move.to === "g1" || move.to === "c1" || move.to === "g8" || move.to === "c8");
            audioCtrlRef.current?.playSound(move, { isCheck, isCastle, startOrEnd: startOrEnd as any });
        } catch {
            // ignore
        }
    }, []);

    const showGameOver = useCallback((result: string | undefined, winnerId: string | null | undefined) => {
        if (gameOverShownRef.current || !result) return;
        gameOverShownRef.current = true;
        const gs = gameStateRef.current;
        const winner = [gs.playerWhite, gs.playerBlack, gs.bot].find((p) => p && p.id === winnerId);
        playSound({} as Move, "END");
        handleGameOver({ result, winnerName: winner?.username, router });
    }, [playSound, router]);

    /** Replaces the local game with the server's version. */
    const applyServerState = useCallback((gs: GameState, force = false) => {
        const cur = gameStateRef.current;
        const stale = cur.status !== "WAITING" && gs.status !== "FINISHED" && gs.moves.length < cur.moves.length;
        if (stale && !force) return;

        updateGame(() => gs);
        chessRef.current = new Chess(gs.currentFen);
        setClocks({ white: gs.whiteTimeLeft, black: gs.blackTimeLeft });
        setResetKey((k) => k + 1);
        if (gs.status === "FINISHED") showGameOver(gs.result, gs.winnerId);
    }, [updateGame, showGameOver]);

    const resync = useCallback(async (force = false) => {
        try {
            const res = await fetch(`/api/games/${gameId}`, { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            applyServerState(data.game, force);
        } catch (e) {
            console.warn("Resync failed", e);
        }
    }, [gameId, applyServerState]);

    const handleGameOverEvent = useCallback((ev: GameOverEvent) => {
        updateGame((prev) => ({ ...prev, status: "FINISHED", result: ev.result, winnerId: ev.winnerId, currentFen: ev.finalFen }));
        try {
            chessRef.current = new Chess(ev.finalFen);
        } catch (e) {
            console.error("Failed to load final FEN:", e);
        }
        setClocks({ white: ev.whiteTimeLeft, black: ev.blackTimeLeft });
        showGameOver(ev.result, ev.winnerId);
    }, [updateGame, showGameOver]);

    const handleRemoteMove = useCallback((ev: MoveEvent) => {
        const cur = gameStateRef.current;
        if (cur.moves.some((m) => m.moveNumber === ev.moveNumber)) return; // echo of our own move
        if (ev.moveNumber !== cur.moves.length + 1) {
            void resync(true); // missed a move
            return;
        }
        updateGame((prev) => withMove(prev, ev));
        try {
            chessRef.current = new Chess(ev.fen);
        } catch {
            void resync(true);
            return;
        }
        setClocks({ white: ev.whiteTimeLeft, black: ev.blackTimeLeft });
        playSound(ev);
    }, [updateGame, resync, playSound]);

    const addChatMessage = useCallback((message: ChatMessage) => {
        updateGame((prev) =>
            prev.chatMessages?.some((m) => m.id && m.id === message.id)
                ? prev
                : { ...prev, chatMessages: [...(prev.chatMessages ?? []), message] }
        );
    }, [updateGame]);

    // Latest handlers, so the Pusher subscription does not have to be re-created on every render.
    const handlersRef = useRef({ handleRemoteMove, handleGameOverEvent, addChatMessage, applyServerState, resync });
    useEffect(() => {
        handlersRef.current = { handleRemoteMove, handleGameOverEvent, addChatMessage, applyServerState, resync };
    });

    // Join a waiting game opened through its code/link
    useEffect(() => {
        if (!user?.id || isBotGame || gameState.status !== "WAITING" || isParticipant || joinRequestedRef.current) return;
        joinRequestedRef.current = true;

        (async () => {
            try {
                const res = await fetch(`/api/games/${gameId}/join`, { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Impossible de rejoindre la partie");
                applyServerState(data.game, true);
            } catch (e: any) {
                await Swal.fire("Erreur", e?.message || "Impossible de rejoindre la partie", "error");
                router.push("/");
            }
        })();
    }, [user?.id, isBotGame, gameState.status, isParticipant, gameId, applyServerState, router]);

    // Real-time channel (online games only): the server publishes, the client listens.
    useEffect(() => {
        if (!isOnlineGame || !user?.id || !isParticipant || initiallyFinished) return;

        let pusher;
        try {
            pusher = getPusherClient();
        } catch (e) {
            console.error("Real-time unavailable, falling back to polling", e);
            return;
        }
        const name = gameChannelName(gameId);
        const channel = pusher.subscribe(name);

        // Fires on the first subscription and after every automatic re-subscription following a reconnect.
        channel.bind("pusher:subscription_succeeded", () => void handlersRef.current.resync());
        channel.bind("start", (data: StartEvent) => handlersRef.current.applyServerState(data.gameState, true));
        channel.bind("move", (data: MoveEvent) => handlersRef.current.handleRemoteMove(data));
        channel.bind("gameOver", (data: GameOverEvent) => handlersRef.current.handleGameOverEvent(data));
        channel.bind("message", (data: ChatMessage) => handlersRef.current.addChatMessage(data));

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(name);
        };
    }, [isOnlineGame, user?.id, isParticipant, initiallyFinished, gameId]);

    // Safety net: poll while waiting for an opponent or when the real-time connection is down.
    useEffect(() => {
        if (!isOnlineGame || !isParticipant || initiallyFinished) return;
        const id = setInterval(() => {
            if (document.hidden || gameStateRef.current.status === "FINISHED") return;
            let connected = false;
            try {
                connected = getPusherClient().connection.state === "connected";
            } catch {
                // not configured: poll
            }
            if (gameStateRef.current.status === "WAITING" || !connected) void handlersRef.current.resync();
        }, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [isOnlineGame, isParticipant, initiallyFinished]);

    // Match announcement
    useEffect(() => {
        if (!user?.id || !isParticipant || announcedRef.current) return;
        if (gameState.status !== "IN_PROGRESS" || gameState.moves.length > 0) return;
        announcedRef.current = true;

        const whiteName = gameState.playerWhite?.username ?? gameState.bot?.username ?? "Bot";
        const blackName = gameState.playerBlack?.username ?? gameState.bot?.username ?? "Bot";
        playSound({} as Move, "START");
        void Swal.fire({
            title: "Match starts!",
            html: `<b>${escapeHtml(whiteName)}</b> (White) vs <b>${escapeHtml(blackName)}</b> (Black)`,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
        });
    }, [user?.id, isParticipant, gameState.status, gameState.moves.length, gameState.playerWhite, gameState.playerBlack, gameState.bot, playSound]);

    // Finished game opened directly
    useEffect(() => {
        if (initiallyFinished) showGameOver(initialGame.result, initialGame.winnerId);
    }, [initiallyFinished, initialGame.result, initialGame.winnerId, showGameOver]);

    const submitMove = useCallback(async (move: Move, asBot: boolean) => {
        try {
            const res = await fetch(`/api/games/${gameId}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: move.from, to: move.to, promotion: move.promotion, asBot }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setClocks({ white: data.move.whiteTimeLeft, black: data.move.blackTimeLeft });
                if (asBot) setBotFailures(0);
                if (data.gameOver) handleGameOverEvent(data.gameOver);
                return;
            }
            if (data.gameOver) {
                handleGameOverEvent(data.gameOver);
                return;
            }
            if (asBot) setBotFailures((n) => n + 1);
            await resync(true);
            if (res.status !== 409) {
                await Swal.fire("Erreur", data.error || "Erreur serveur", "error");
            }
        } catch (e) {
            console.error("Failed to submit move:", e);
            if (asBot) setBotFailures((n) => n + 1);
            await resync(true);
        }
    }, [gameId, handleGameOverEvent, resync]);

    const handleMove = useCallback((move: Move, isBotMove: boolean) => {
        const cur = gameStateRef.current;
        if (cur.status !== "IN_PROGRESS" || !move.fen) return;

        // Optimistic update; the server stays authoritative and we resync if it disagrees.
        const completeMove: Move = { ...move, moveNumber: cur.moves.length + 1 };
        updateGame((prev) => withMove(prev, completeMove));
        try {
            chessRef.current = new Chess(move.fen);
        } catch {
            // keep the previous position, the server answer will resync us
        }
        playSound(move);

        // Serialised so a slow request can never be overtaken by the next one (e.g. human move, then bot reply).
        postQueueRef.current = postQueueRef.current.then(() => submitMove(completeMove, isBotMove));
    }, [updateGame, playSound, submitMove]);

    // Local clock display; the server owns the real clocks and sends exact values with every move.
    useEffect(() => {
        if (gameState.status !== "IN_PROGRESS" || !hasClock) return;
        let last = Date.now();
        const key = turn === "w" ? "white" : "black";
        const id = setInterval(() => {
            const now = Date.now();
            const delta = now - last;
            last = now;
            setClocks((prev) => {
                const current = prev[key];
                if (current == null || current <= 0) return prev;
                return { ...prev, [key]: Math.max(0, current - delta) };
            });
        }, CLOCK_TICK_MS);
        return () => clearInterval(id);
    }, [gameState.status, hasClock, turn]);

    // When our local clock hits zero, ask the server to confirm the timeout.
    const remainingOfSideToMove = turn === "w" ? clocks.white : clocks.black;
    useEffect(() => {
        if (!isParticipant || gameState.status !== "IN_PROGRESS") return;
        if (remainingOfSideToMove == null || remainingOfSideToMove > 0) {
            timeoutClaimedRef.current = false;
            return;
        }
        if (timeoutClaimedRef.current) return;
        timeoutClaimedRef.current = true;

        (async () => {
            try {
                const res = await fetch(`/api/games/${gameId}/timeout`, { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.gameOver) {
                    handleGameOverEvent(data.gameOver);
                    return;
                }
                await resync(true);
            } catch (e) {
                console.error("Timeout claim failed:", e);
            }
            // The server clock may be slightly ahead of ours: allow another attempt.
            setTimeout(() => {
                timeoutClaimedRef.current = false;
            }, 1500);
        })();
    }, [isParticipant, gameState.status, remainingOfSideToMove, gameId, handleGameOverEvent, resync]);

    if (isOnlineGame && gameState.status === "WAITING") {
        return <GameLayout gamePanel={<GameWaiting value={gameState.code || ""} />} />;
    }

    return (
        <GameLayout
            chessBoard={
                <ChessboardWrapper
                    boardOrientation={orientation}
                    currentFen={gameState.currentFen}
                    onMove={handleMove}
                    canPlay={canPlay}
                    isStatic={false}
                    isOnline={isOnlineGame}
                    botElo={initialGame.bot?.elo}
                    isBotTurn={isBotTurn}
                    resetKey={resetKey}
                />
            }
            gamePanel={
                <GameInfos
                    game={gameState}
                    playerWhite={gameState.playerWhite}
                    playerBlack={gameState.playerBlack}
                    user={user}
                    moves={gameState.moves}
                    chatMessages={gameState.chatMessages || []}
                    onChatMessage={addChatMessage}
                />
            }
            isGameStarted={true}
            capturedPieces={gameState.capturedPieces}
            playerPlaying={turn}
            whiteTimeLeft={clocks.white}
            blackTimeLeft={clocks.black}
        />
    );
};

export { GameBoard };
