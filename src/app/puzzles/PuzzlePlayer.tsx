"use client";

import {apiFetch} from "@/lib/api";
import React, {useEffect, useState, useCallback, useRef} from "react";
import GameLayout from "@/app/components/game/GameLayout";
import PuzzleInfos from "@/app/components/game/panel/PuzzleInfos";
import ChessboardWrapper, {
    ERROR_SQUARE_COLOR,
    HIGHLIGHT_SQUARE_COLOR
} from "@/app/components/chessBoard/ChessboardWrapper";
import {Move} from "@/app/types/game";
import {Chess} from "chess.js";
import {createAudioController, AudioController} from '@/lib/audio';

interface Props {
    themeCategory?: string;
}

export const PuzzlePlayer: React.FC<Props> = ({themeCategory}) => {
    const [puzzle, setPuzzle] = useState<{
        puzzleId: string;
        themes: string[];
        startFen: string;
        solution: Array<Move>;
        difficulty: number
    } | null>(null);
    const [currentFen, setCurrentFen] = useState<string | undefined>(undefined);
    const [moves, setMoves] = useState<Move[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [isStatic, setIsStatic] = useState(true);
    const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
    const [resetKey, setResetKey] = useState<number>(0);
    const [helpSquare, setHelpSquare] = useState<Record<string, React.CSSProperties>[]>([]);
    const [helpMove, setHelpMove] = useState<Move[]>([]);
    const [helpLevel, setHelpLevel] = useState<number>(0);
    const chessRefPrevFen = useRef<string | undefined>(undefined);
    const progressRef = useRef<number>(0); // number of half-moves already applied from solution
    const audioCtrlRef = useRef<AudioController | null>(null);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const applyMoveAndGetFen = (chess: Chess, move: Move, skipIfMoveHasFen = false) => {
        if (!skipIfMoveHasFen || !move.fen) {
            chess.move({from: move.from, to: move.to, promotion: move.promotion || 'q'});
        }
        return chess.fen();
    };

    const playMoveSound = (move: Move, chess: Chess) => {
        try {
            if (!audioCtrlRef.current) audioCtrlRef.current = createAudioController();
            const isCastle = chess.get(move.to as any)?.type === 'k' && ['g1', 'c1', 'g8', 'c8'].includes(move.to);
            audioCtrlRef.current?.playSound(move, {isCheck: chess.isCheck(), isCastle});
        } catch (e) {
            // ignore audio errors
        }
    };

    const determineBoardOrientation = useCallback((fen: string) => {
        const parts = fen.split(' ');
        if (parts.length < 2) return "white";
        // the first side to move is the opponent's
        return parts[1] === 'w' ? "black" : "white";
    }, []);

    const fetchNext = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/puzzles/next?themeCategory=' + themeCategory)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setErrorMessage(err.error || "Erreur lors du chargement du puzzle.");
                return;
            }
            const data = await res.json();
            if (!data) return;

            setPuzzle({
                puzzleId: data.puzzleId,
                themes: data.themes,
                startFen: data.startFen,
                difficulty: data.difficulty,
                solution: data.solution || []
            });

            setCurrentFen(data.startFen);
            setMoves([]);
            setIsStatic(false);
            setErrorMessage("");
            setBoardOrientation(determineBoardOrientation(data.startFen));
            setHelpLevel(0);
            setHelpSquare([]);
            setHelpMove([]);
            chessRefPrevFen.current = data.startFen;
            progressRef.current = 0;
            setResetKey(k => k + 1);

            await sleep(1000);
            const chess = new Chess(data.startFen);
            const firstMove = data.solution[0];
            if (firstMove) {
                const newFen = applyMoveAndGetFen(chess, firstMove, true);
                chessRefPrevFen.current = newFen;
                setCurrentFen(newFen);
                setMoves([firstMove]);
                progressRef.current = 1;
                playMoveSound(firstMove, chess);
            }
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [determineBoardOrientation, themeCategory]);

    async function updatePuzzle(puzzleId: string, solved: boolean = false) {
        try {
            const res = await apiFetch('/api/puzzles/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({puzzleId: puzzleId, solved}),
            });
            if (!res.ok) {
                setErrorMessage("Erreur lors de l'enregistrement du puzzle.");
                return;
            }
        } catch (e: any) {
            console.error(e);
        }
    }

    useEffect(() => {
        fetchNext();
    }, [fetchNext]);

    useEffect(() => {
        try {
            audioCtrlRef.current = createAudioController();
        } catch (e) {
            console.warn('Audio init failed', e);
        }

        function unlockAudioOnce() {
            try {
                if (!audioCtrlRef.current) audioCtrlRef.current = createAudioController();
            } catch (e) {
                // ignore
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('pointerdown', unlockAudioOnce, {once: true});
        }

        return () => {
            try { audioCtrlRef.current?.dispose(); audioCtrlRef.current = null; } catch (e) {}
            try { if (typeof window !== 'undefined') window.removeEventListener('pointerdown', unlockAudioOnce as any); } catch (e) {}
        };
    }, []);

    const handleMove = useCallback(async (move: Move, _isBotMove: boolean) => {
        if (!puzzle) return;

        const chess = new Chess(move.fen || chessRefPrevFen.current);
        if (!move.fen) {
            chess.move({from: move.from, to: move.to, promotion: move.promotion || 'q'});
        }

        playMoveSound(move, chess);

        const idx = progressRef.current;
        const expected = puzzle.solution[idx];

        if (!expected || expected.from !== move.from || expected.to !== move.to) {
            setErrorMessage("Ce n'est pas le bon coup. Réessaie !");
            setIsStatic(true);
            setHelpSquare([
                {[move.from]: {backgroundColor: ERROR_SQUARE_COLOR}},
                {[move.to]: {backgroundColor: ERROR_SQUARE_COLOR}}
            ]);
            await updatePuzzle(puzzle.puzzleId);
            return;
        }

        setErrorMessage("");
        setHelpLevel(0);
        setHelpSquare([]);
        setHelpMove([]);
        progressRef.current++;

        const newFen = chess.fen();
        chessRefPrevFen.current = newFen;
        setCurrentFen(newFen);
        setMoves(prev => [...prev, move]);

        const nextMove = puzzle.solution[progressRef.current];
        if (nextMove) {
            await sleep(600);

            chess.move({from: nextMove.from, to: nextMove.to, promotion: nextMove.promotion || 'q'});
            const nextFen = chess.fen();
            chessRefPrevFen.current = nextFen;
            setCurrentFen(nextFen);
            setMoves(prev => [...prev, nextMove]);

            playMoveSound(nextMove, chess);
            progressRef.current++;
        } else if (progressRef.current >= puzzle.solution.length) {
            await updatePuzzle(puzzle.puzzleId, true);
        }
    }, [puzzle]);

    const resetPuzzle = useCallback(() => {
        if (!puzzle) return;
        setCurrentFen(chessRefPrevFen.current);
        setErrorMessage("");
        setIsStatic(false);
        setHelpLevel(0);
        setHelpSquare([]);
        setHelpMove([]);
        setResetKey(k => k + 1);

        if (moves.length === 1) {
            const firstMove = puzzle.solution[0];
            if (firstMove) {
                const chess = new Chess(puzzle.startFen);
                const newFen = applyMoveAndGetFen(chess, firstMove, true);
                chessRefPrevFen.current = newFen;
                setCurrentFen(newFen);
                setMoves([firstMove]);
                progressRef.current = 1;
            }
        }
    }, [puzzle, moves]);

    const helpPuzzle = useCallback(() => {
        if (!puzzle) return;

        const nextMove = puzzle.solution[progressRef.current];
        if (!nextMove) return;

        const newHelpLevel = Math.min(helpLevel + 1, 2);
        setHelpLevel(newHelpLevel);

        if (newHelpLevel === 1) {
            setHelpSquare([{[nextMove.from]: {backgroundColor: HIGHLIGHT_SQUARE_COLOR}}]);
        } else {
            setHelpMove([nextMove]);
        }
    }, [puzzle, helpLevel]);

    const fullResetPuzzles = useCallback(async () => {
        try {
            const res = await apiFetch('/api/puzzles/reset', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
            });
            if (!res.ok) {
                setErrorMessage("Erreur lors de la réinitialisation des puzzles.");
                return;
            }
            await fetchNext();
        } catch (e: any) {
            console.error(e);
        }
    }, [fetchNext]);

    return (
        <GameLayout
            chessBoard={
                <ChessboardWrapper
                    boardOrientation={boardOrientation}
                    currentFen={currentFen}
                    onMove={handleMove}
                    isStatic={isStatic}
                    resetKey={resetKey}
                    highlightedSquares={helpSquare}
                    highlightedMoves={helpMove}
                />
            }
            gamePanel={
                <PuzzleInfos
                    loading={loading}
                    errorMessage={errorMessage}
                    themes={puzzle?.themes || []}
                    difficulty={puzzle?.difficulty || 0}
                    isSolved={progressRef.current >= (puzzle?.solution.length || 0)}
                    onReset={resetPuzzle}
                    onFullReset={fullResetPuzzles}
                    onHelp={helpPuzzle}
                    onNext={fetchNext}
                />
            }
        />
    );
}
