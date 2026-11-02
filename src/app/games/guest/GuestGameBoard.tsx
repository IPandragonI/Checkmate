"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chess, Square } from "chess.js";
import Swal from "sweetalert2";
import ChessboardWrapper from "@/app/components/chessBoard/ChessboardWrapper";
import GameInfos from "@/app/components/game/panel/GameInfos";
import GameLayout from "@/app/components/game/GameLayout";
import FullScreenLoader from "@/app/utils/FullScreenLoader";
import { Move } from "@/app/types/game";
import { handleGameOver } from "@/app/games/utils/gameUtils";
import { AudioController, createAudioController } from "@/lib/audio";
import { applyGuestMove, claimGuestTimeout, liveClocks, toGameState, turnOf } from "@/lib/guest/engine";
import { GUEST_USER_ID } from "@/lib/guest/mode";
import { getGuestBot, getGuestGame, GuestGame, guestUser, loadGuestData, saveGuestGame } from "@/lib/guest/store";

const CLOCK_TICK_MS = 250;

/** A game against a bot played entirely in the browser: rules, clocks and history live in localStorage. */
export default function GuestGameBoard({ gameId }: { gameId: string }) {
    const router = useRouter();
    // undefined = still loading from localStorage, null = unknown game
    const [game, setGame] = useState<GuestGame | null | undefined>(undefined);
    const [resetKey, setResetKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    const gameRef = useRef<GuestGame | null>(null);
    const audioRef = useRef<AudioController | null>(null);
    const overShownRef = useRef(false);
    const announcedRef = useRef(false);

    useEffect(() => {
        const stored = getGuestGame(gameId) ?? null;
        gameRef.current = stored;
        setGame(stored);
    }, [gameId]);

    useEffect(() => {
        try {
            audioRef.current = createAudioController();
        } catch (e) {
            console.warn("Audio init failed", e);
        }
        return () => {
            try {
                audioRef.current?.dispose();
                audioRef.current = null;
            } catch {
                // ignore
            }
        };
    }, []);

    const playSound = useCallback((move: Move, startOrEnd?: string) => {
        try {
            const chess = new Chess(gameRef.current?.fen);
            const isCastle =
                chess.get(move.to as Square)?.type === "k" && ["g1", "c1", "g8", "c8"].includes(move.to);
            audioRef.current?.playSound(move, { isCheck: chess.isCheck(), isCastle, startOrEnd: startOrEnd as any });
        } catch {
            // ignore
        }
    }, []);

    const showGameOver = useCallback((g: GuestGame) => {
        if (overShownRef.current || g.status !== "FINISHED" || !g.result) return;
        overShownRef.current = true;
        const winnerName =
            g.winnerId === GUEST_USER_ID ? loadGuestData().profile.username : g.winnerId === g.botId ? getGuestBot(g.botId)?.username : null;
        playSound({} as Move, "END");
        handleGameOver({ result: g.result, winnerName, router });
    }, [playSound, router]);

    const commit = useCallback((next: GuestGame) => {
        gameRef.current = next;
        saveGuestGame(next);
        setGame(next);
        showGameOver(next);
    }, [showGameOver]);

    const handleMove = useCallback((move: Move, isBotMove: boolean) => {
        const current = gameRef.current;
        if (!current) return;

        const result = applyGuestMove(current, { from: move.from, to: move.to, promotion: move.promotion }, isBotMove);
        if (result.game !== current) commit(result.game);
        if (result.ok) {
            playSound(result.game.moves[result.game.moves.length - 1]);
        } else {
            setResetKey((k) => k + 1); // put the board back on the real position
        }
    }, [commit, playSound]);

    // Clock display + timeout detection (the clock is derived from timestamps, so it survives reloads)
    const inProgress = game?.status === "IN_PROGRESS";
    const hasClock = game?.timeLimit != null;
    useEffect(() => {
        if (!inProgress || !hasClock) return;
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            const current = gameRef.current;
            const next = current && claimGuestTimeout(current, t);
            if (current && next && next !== current) commit(next);
        }, CLOCK_TICK_MS);
        return () => clearInterval(id);
    }, [inProgress, hasClock, commit]);

    // A finished game opened from the history shows its result once
    useEffect(() => {
        if (game?.status === "FINISHED") showGameOver(game);
    }, [game, showGameOver]);

    useEffect(() => {
        if (!game || announcedRef.current || game.status !== "IN_PROGRESS" || game.moves.length > 0) return;
        announcedRef.current = true;
        const bot = getGuestBot(game.botId);
        const me = loadGuestData().profile.username;
        const [white, black] = game.humanColor === "w" ? [me, bot?.username] : [bot?.username, me];
        playSound({} as Move, "START");
        void Swal.fire({
            title: "Match starts!",
            text: `${white} (White) vs ${black} (Black)`,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
        });
    }, [game, playSound]);

    const profileData = useMemo(() => loadGuestData(), [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (game === undefined) return <FullScreenLoader />;
    const bot = game ? getGuestBot(game.botId) : undefined;
    if (!game || !bot) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Partie introuvable sur cet appareil.</p>
                <Link href="/games/create" className="btn btn-primary">Nouvelle partie</Link>
            </div>
        );
    }

    const turn = turnOf(game.fen);
    const clocks = liveClocks(game, now);
    const gameState = toGameState(game, bot, profileData);

    return (
        <GameLayout
            chessBoard={
                <ChessboardWrapper
                    boardOrientation={game.humanColor === "b" ? "black" : "white"}
                    currentFen={game.fen}
                    onMove={handleMove}
                    canPlay={inProgress && turn === game.humanColor}
                    isStatic={false}
                    isOnline={false}
                    botElo={bot.elo}
                    isBotTurn={inProgress && turn !== game.humanColor}
                    resetKey={resetKey}
                />
            }
            gamePanel={
                <GameInfos
                    game={gameState}
                    playerWhite={gameState.playerWhite}
                    playerBlack={gameState.playerBlack}
                    user={guestUser(profileData)}
                    moves={game.moves}
                    chatMessages={[]}
                />
            }
            isGameStarted={true}
            capturedPieces={game.capturedPieces}
            playerPlaying={turn}
            whiteTimeLeft={clocks.white}
            blackTimeLeft={clocks.black}
        />
    );
}
