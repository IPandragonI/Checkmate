"use client";

import React, {useEffect, useRef, useState} from "react";
import {Chessboard, PieceDropHandlerArgs, SquareHandlerArgs} from "react-chessboard";
import {getBoardStyles} from "@/app/components/chessBoard/ChessOptions";
import {Chess, Square} from "chess.js";
import {Move} from "@/app/types/game";
import {computeBotMove} from "@/app/games/utils/botEngine";

interface ChessboardWrapperProps {
    boardOrientation?: "white" | "black";
    botElo?: number;
    isOnline?: boolean;
    onMove?: (move: Move, isBotMove: boolean) => void;
    currentFen?: string;
    canPlay?: boolean;
    isStatic?: boolean;
    isBotTurn?: boolean;
    resetKey?: number;
    highlightedSquares?: Array<Record<string, React.CSSProperties>>;
    highlightedMoves?: Array<Move>;
    showAnimations?: boolean;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MOVE_FROM_COLOR = 'rgb(34,111,227, 0.56)';
export const ERROR_SQUARE_COLOR = 'rgba(228, 92, 92, 0.56)';
export const HIGHLIGHT_SQUARE_COLOR = 'rgba(62, 181, 93, 0.56)';
const HIGHLIGHT_ARROW_COLOR = 'rgba(246, 206, 84, 0.8)';

const ChessboardWrapper: React.FC<ChessboardWrapperProps> = ({
                                                                 boardOrientation = "white",
                                                                 botElo,
                                                                 isOnline = false,
                                                                 onMove,
                                                                 currentFen,
                                                                 canPlay = true,
                                                                 isStatic = true,
                                                                 isBotTurn = false,
                                                                 resetKey = 0,
                                                                 highlightedSquares = [],
                                                                 highlightedMoves = [],
                                                                 showAnimations = true,
                                                             }) => {
    const chessGameRef = useRef(new Chess());
    const chessGame = chessGameRef.current;

    const [chessPosition, setChessPosition] = useState(chessGame.fen());
    const [moveFrom, setMoveFrom] = useState('');
    const [moveOptionSquares, setMoveOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const lastMergedSquaresJsonRef = useRef<string>('');
    const prevMergedRef = useRef<Record<string, React.CSSProperties> | null>(null);
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const [arrows, setArrows] = useState<Array<{startSquare: Square, endSquare: Square, color: string}>>([]);
    const lastArrowsJsonRef = useRef<string>('');

    const boardStyles = getBoardStyles();

    useEffect(() => {
        if (!currentFen) return;
        try {
            chessGame.load(currentFen);
            setChessPosition(currentFen);
            setMoveOptionSquares({});
        } catch (e) {
            console.error('Failed to load FEN in ChessboardWrapper', e);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFen, resetKey]);

     
    // The bot plays whenever it is its turn (first move, reload mid-game, retry after a failed save).
    useEffect(() => {
        if (!botElo || isOnline || isStatic || !isBotTurn) return;
        const delay = chessGame.fen() === DEFAULT_FEN ? 500 : Math.random() * (3000 - 800) + 800;
        const timer = setTimeout(makeBotMove, delay);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [botElo, isOnline, isStatic, isBotTurn, currentFen, resetKey]);

    useEffect(() => {
        const merged: Record<string, React.CSSProperties> = {};
        for (const hs of highlightedSquares) {
            for (const key in hs) merged[key] = hs[key];
        }
        for (const key in moveOptionSquares) merged[key] = moveOptionSquares[key];
        if (moveFrom) merged[moveFrom] = { background: MOVE_FROM_COLOR };

        let shouldUpdate = false;
        try {
            const s = JSON.stringify(merged);
            if (lastMergedSquaresJsonRef.current !== s) {
                lastMergedSquaresJsonRef.current = s;
                shouldUpdate = true;
                prevMergedRef.current = merged;
            }
        } catch (e) {
            // fallback: shallow compare with prevMergedRef (avoid reading optionSquares state directly)
            const prev = prevMergedRef.current;
            if (!prev) {
                shouldUpdate = true;
                prevMergedRef.current = merged;
            } else {
                const mergedKeys = Object.keys(merged);
                const prevKeys = Object.keys(prev);
                if (mergedKeys.length !== prevKeys.length) {
                    shouldUpdate = true;
                    prevMergedRef.current = merged;
                } else {
                    for (const k of mergedKeys) {
                        const a = prev[k];
                        const b = merged[k];
                        try {
                            if (JSON.stringify(a) !== JSON.stringify(b)) { shouldUpdate = true; prevMergedRef.current = merged; break; }
                        } catch (_e) {
                            if (a !== b) { shouldUpdate = true; prevMergedRef.current = merged; break; }
                        }
                    }
                }
            }
        }

        if (shouldUpdate) setOptionSquares(merged);
    }, [highlightedSquares, moveOptionSquares, moveFrom]);

    useEffect(() => {
         // compute target arrows
         if (!highlightedMoves || highlightedMoves.length === 0) {
             setArrows(prev => (prev.length === 0 ? prev : []));
             lastArrowsJsonRef.current = '[]';
             return;
         }

         const newArrows: Array<{startSquare: Square, endSquare: Square, color: string}> = highlightedMoves.map(m => ({
             startSquare: m.from as Square,
             endSquare: m.to as Square,
             color: HIGHLIGHT_ARROW_COLOR
         }));

         setArrows(prev => {
             if (prev.length !== newArrows.length) {
                 try { lastArrowsJsonRef.current = JSON.stringify(newArrows); } catch {}
                 return newArrows;
             }
             for (let i = 0; i < prev.length; i++) {
                 if (prev[i].startSquare !== newArrows[i].startSquare || prev[i].endSquare !== newArrows[i].endSquare || prev[i].color !== newArrows[i].color) {
                     try { lastArrowsJsonRef.current = JSON.stringify(newArrows); } catch {}
                     return newArrows;
                 }
             }
             return prev;
         });
     }, [highlightedMoves, moveFrom]);

    function makeBotMove() {
        if (chessGame.isGameOver()) {
            return;
        }

        const botMove = computeBotMove(chessGame, botElo as number);

        const fenBefore = chessGame.fen();
        const move = chessGame.move(botMove);

        const fenAfter = move ? getFenAfterMove(move.from, move.to, fenBefore) : chessGame.fen();
        if (onMove) onMove({
            from: move?.from,
            to: move?.to,
            promotion: 'q',
            fen: fenAfter as string,
            capturedPiece: move?.captured
        }, true);
        setChessPosition(chessGame.fen());
    }

    function getFenAfterMove(from: Square, to: Square, baseFen?: string) {
        if (!from || !to) return null;
        const tempChess = new Chess(baseFen ?? chessGame.fen());
        try {
            const result = tempChess.move({from, to, promotion: 'q'});
            if (!result) return null;
            return tempChess.fen();
        } catch {
            return null;
        }
    }
    
     function getMoveOptions(square: Square) {
         const moves = chessGame.moves({
             square,
             verbose: true
         });

         if (moves.length === 0) {
             setMoveOptionSquares({});
             return false;
         }

         const newSquares: Record<string, React.CSSProperties> = {};

         for (const move of moves) {
             newSquares[move.to] = {
                 background: chessGame.get(move.to) && chessGame.get(move.to)?.color !== chessGame.get(square)?.color ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                     : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                 borderRadius: '50%'
             };
         }

         newSquares[square] = {
             background: MOVE_FROM_COLOR
         };


        for (const hs of highlightedSquares) {
            for (const key in hs) {
                newSquares[key] = hs[key];
            }
        }
        setMoveOptionSquares(newSquares);

         return true;
     }

     function onSquareClick({
                                square,
                                piece
                            }: SquareHandlerArgs) {
         if (isStatic) return;

         if (!canPlay) {
             setMoveFrom('');
             return;
         }

         if (!moveFrom && piece) {
             const hasMoveOptions = getMoveOptions(square as Square);

             if (hasMoveOptions) {
                 setMoveFrom(square);
             }

             return;
         }

         const moves = chessGame.moves({
             square: moveFrom as Square,
             verbose: true
         });
         const foundMove = moves.find(m => m.from === moveFrom && m.to === square);

         if (!foundMove) {
             const hasMoveOptions = getMoveOptions(square as Square);

             setMoveFrom(hasMoveOptions ? square : '');
             return;
         }

         let move;
         try {
             const fenBefore = chessGame.fen();
             move = chessGame.move({
                 from: moveFrom,
                 to: square,
                 promotion: 'q'
             });
             if (onMove) onMove({
                 from: moveFrom,
                 to: square,
                 promotion: 'q',
                 fen: getFenAfterMove(moveFrom as Square, square as Square, fenBefore) as string,
                 capturedPiece: move?.captured
             }, false);

         } catch {
             const hasMoveOptions = getMoveOptions(square as Square);

             if (hasMoveOptions) {
                 setMoveFrom(square);
             }

             return;
         }

         setChessPosition(chessGame.fen());
         setMoveFrom('');
         setMoveOptionSquares({});
     }

     function onPieceDrop({
                              sourceSquare,
                              targetSquare
                          }: PieceDropHandlerArgs) {
         if (!targetSquare || isStatic || !canPlay) {
             return false;
         }

         try {
             const fenBefore = chessGame.fen();
             const move = chessGame.move({
                 from: sourceSquare,
                 to: targetSquare,
                 promotion: 'q'
             });

             if (onMove) onMove({
                 from: sourceSquare,
                 to: targetSquare,
                 promotion: 'q',
                 fen: getFenAfterMove(move?.from as Square, move?.to as Square, fenBefore) as string,
                 capturedPiece: move?.captured
             }, false);
             setChessPosition(chessGame.fen());

             setMoveFrom('');
             setMoveOptionSquares({});

             return true;
         } catch {
             return false;
         }
     }

    const chessboardOptions = {
        ...boardStyles,
        position: chessPosition,
        squareStyles: optionSquares,
        arrows: arrows,
        showAnimations: showAnimations,
        id: 'click-or-drag-to-move',
        allowDragging: canPlay && !isBotTurn && !isStatic,
        boardOrientation: boardOrientation,
    };

    if (!isStatic) {
        Object.assign(chessboardOptions, {
            onSquareClick: onSquareClick,
            onPieceDrop: onPieceDrop,
             arePiecesDraggable: canPlay && !isBotTurn,
        });
    }

    return (
        <div className="w-full h-full aspect-square flex items-center justify-center">
            <Chessboard options={chessboardOptions}/>
        </div>
    );
};

export default ChessboardWrapper;
