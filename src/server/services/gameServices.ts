import { randomInt } from "node:crypto";
import { Chess } from "chess.js";
import { GameResult, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type {
    ChatMessage,
    GameOverEvent,
    GameState,
    MoveEvent,
    Player,
} from "@/app/types/game";

type Tx = Prisma.TransactionClient;
type Color = "w" | "b";

const PLAYER_SELECT = {
    id: true,
    username: true,
    displayUsername: true,
    name: true,
    image: true,
    elo: true,
} satisfies Prisma.UserSelect;

const MOVE_SELECT = {
    from: true,
    to: true,
    promotion: true,
    capturedPiece: true,
    fen: true,
    moveNumber: true,
    timestamp: true,
} satisfies Prisma.MoveSelect;

const CHAT_HISTORY_LIMIT = 100;
export const CHAT_MAX_LENGTH = 500;
const ELO_K = 32;
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const GAME_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function mapUserToPlayer(user: Prisma.UserGetPayload<{ select: typeof PLAYER_SELECT }> | null): Player | undefined {
    if (!user) return undefined;
    return {
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername ?? undefined,
        name: user.name,
        image: user.image ?? undefined,
        elo: user.elo,
    };
}

function turnOf(fen: string): Color {
    return fen.split(" ")[1] === "b" ? "b" : "w";
}

/** Position part of a FEN (placement, side to move, castling, en passant) used for repetition counting. */
function positionKey(fen: string) {
    return fen.split(" ").slice(0, 4).join(" ");
}

interface ClockSnapshot {
    status: string;
    currentFen: string;
    whiteTimeLeft: number | null;
    blackTimeLeft: number | null;
    lastMoveAt: Date | null;
}

/** Remaining time of both players "right now", taking the running clock into account. */
function liveClocks(game: ClockSnapshot, now = new Date()) {
    let white = game.whiteTimeLeft;
    let black = game.blackTimeLeft;
    if (game.status === "IN_PROGRESS" && game.lastMoveAt) {
        const elapsed = Math.max(0, now.getTime() - game.lastMoveAt.getTime());
        if (turnOf(game.currentFen) === "w") {
            if (white != null) white = Math.max(0, white - elapsed);
        } else if (black != null) {
            black = Math.max(0, black - elapsed);
        }
    }
    return { whiteTimeLeft: white, blackTimeLeft: black };
}

export type ApplyMoveResult =
    | { ok: true; isBotGame: boolean; move: MoveEvent; gameOver?: GameOverEvent }
    | { ok: false; status: number; error: string; isBotGame?: boolean; gameOver?: GameOverEvent };

export type JoinResult =
    | { ok: true; started: boolean; game: GameState }
    | { ok: false; status: number; error: string };

export type TimeoutResult =
    | { ok: true; gameOver: GameOverEvent }
    | { ok: false; status: number; error: string };

class ConflictError extends Error {}

export class GameService {
    /**
     * Full state of a game, with clocks adjusted to "now" for games in progress.
     */
    static async getGameState(gameId: string): Promise<GameState | null> {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                playerWhite: { select: PLAYER_SELECT },
                playerBlack: { select: PLAYER_SELECT },
                bot: true,
                moves: { orderBy: { moveNumber: "asc" }, select: MOVE_SELECT },
                messages: { orderBy: { sentAt: "desc" }, take: CHAT_HISTORY_LIMIT },
            },
        });

        if (!game) return null;

        const clocks = liveClocks(game);

        return {
            id: game.id,
            code: game.code,
            status: game.status,
            result: game.result ?? undefined,
            winnerId: game.winnerId,
            currentFen: game.currentFen,
            moves: game.moves.map((m) => ({
                from: m.from,
                to: m.to,
                promotion: m.promotion ?? undefined,
                capturedPiece: m.capturedPiece ?? undefined,
                fen: m.fen,
                moveNumber: m.moveNumber,
                timestamp: m.timestamp.toISOString(),
            })),
            capturedPieces: normalizeCaptured(game.capturedPieces),
            playerWhite: mapUserToPlayer(game.playerWhite),
            playerBlack: mapUserToPlayer(game.playerBlack),
            bot: game.bot
                ? { id: game.bot.id, username: game.bot.username, label: game.bot.label, elo: game.bot.elo, img: game.bot.img }
                : undefined,
            chatMessages: game.messages
                .map((m) => ({ id: m.id, userId: m.userId, message: m.message, sentAt: m.sentAt.toISOString() }))
                .reverse(),
            timeMode: game.timeMode,
            timeLimit: game.timeLimit,
            whiteTimeLeft: clocks.whiteTimeLeft,
            blackTimeLeft: clocks.blackTimeLeft,
        };
    }

    static async isParticipant(gameId: string, userId: string): Promise<boolean> {
        const game = await prisma.game.findFirst({
            where: { id: gameId, OR: [{ playerWhiteId: userId }, { playerBlackId: userId }] },
            select: { id: true },
        });
        return !!game;
    }

    /**
     * Creates a game. Online games wait for an opponent; bot games start immediately.
     * The access code is generated server-side.
     */
    static async createGame(
        userId: string,
        opts: { mode: "online" | "bot"; color: "white" | "black" | "random"; timeLimitMs: number | null; timeMode: string; botId?: string }
    ): Promise<{ id: string; code: string }> {
        const color = opts.color === "random" ? (randomInt(2) === 0 ? "white" : "black") : opts.color;
        const isBot = opts.mode === "bot";

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await prisma.game.create({
                    data: {
                        code: generateGameCode(),
                        status: isBot ? "IN_PROGRESS" : "WAITING",
                        timeMode: opts.timeMode as never,
                        timeLimit: opts.timeLimitMs,
                        whiteTimeLeft: opts.timeLimitMs,
                        blackTimeLeft: opts.timeLimitMs,
                        playerWhiteId: color === "white" ? userId : null,
                        playerBlackId: color === "black" ? userId : null,
                        botId: isBot ? opts.botId : null,
                        lastMoveAt: isBot ? new Date() : null,
                    },
                    select: { id: true, code: true },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
                throw error;
            }
        }
        throw new Error("Unable to generate a unique game code");
    }

    /**
     * Joins a waiting online game. The game starts as soon as both seats are taken.
     */
    static async joinGame(gameId: string, userId: string): Promise<JoinResult> {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            select: { status: true, botId: true, playerWhiteId: true, playerBlackId: true },
        });
        if (!game) return { ok: false, status: 404, error: "Partie introuvable" };
        if (game.botId) return { ok: false, status: 400, error: "Cette partie est contre un bot" };

        const alreadyIn = game.playerWhiteId === userId || game.playerBlackId === userId;
        if (alreadyIn) {
            return { ok: true, started: false, game: (await this.getGameState(gameId))! };
        }
        if (game.status !== "WAITING") return { ok: false, status: 409, error: "Partie complète" };

        const takeWhite = !game.playerWhiteId;
        const takeBlack = !takeWhite && !game.playerBlackId;
        if (!takeWhite && !takeBlack) return { ok: false, status: 409, error: "Partie complète" };

        const nowFull = takeWhite ? !!game.playerBlackId : !!game.playerWhiteId;
        const { count } = await prisma.game.updateMany({
            where: {
                id: gameId,
                status: "WAITING",
                ...(takeWhite ? { playerWhiteId: null } : { playerBlackId: null }),
            },
            data: {
                ...(takeWhite ? { playerWhiteId: userId } : { playerBlackId: userId }),
                ...(nowFull ? { status: "IN_PROGRESS", lastMoveAt: new Date() } : {}),
            },
        });
        if (count !== 1) return { ok: false, status: 409, error: "Partie complète" };

        return { ok: true, started: nowFull, game: (await this.getGameState(gameId))! };
    }

    /**
     * Validates and applies a move atomically: authorization, turn, clock, legality, persistence,
     * game-over detection and rating update all happen in one transaction.
     */
    static async applyMove(
        gameId: string,
        userId: string,
        input: { from: string; to: string; promotion?: string; asBot?: boolean }
    ): Promise<ApplyMoveResult> {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            select: {
                status: true,
                currentFen: true,
                capturedPieces: true,
                playerWhiteId: true,
                playerBlackId: true,
                botId: true,
                whiteTimeLeft: true,
                blackTimeLeft: true,
                lastMoveAt: true,
            },
        });
        if (!game) return { ok: false, status: 404, error: "Partie introuvable" };

        const isBotGame = !!game.botId;
        if (game.status !== "IN_PROGRESS") return { ok: false, status: 409, error: "La partie n'est pas en cours", isBotGame };

        const turn = turnOf(game.currentFen);
        const whiteId = game.playerWhiteId ?? game.botId;
        const blackId = game.playerBlackId ?? game.botId;
        const humanColor: Color | null =
            game.playerWhiteId === userId ? "w" : game.playerBlackId === userId ? "b" : null;

        if (!humanColor) return { ok: false, status: 403, error: "Vous n'êtes pas joueur de cette partie", isBotGame };

        // In bot games the engine runs in the browser: the human submits the bot's moves, but only on the bot's turn.
        if (isBotGame) {
            const botsTurn = turn !== humanColor;
            if (botsTurn !== !!input.asBot) {
                return { ok: false, status: 409, error: "Ce n'est pas votre tour", isBotGame };
            }
        } else if (turn !== humanColor) {
            return { ok: false, status: 409, error: "Ce n'est pas votre tour", isBotGame };
        }
        const moverId = (turn === "w" ? whiteId : blackId)!;
        const opponentId = (turn === "w" ? blackId : whiteId)!;

        // Server-side clock
        const now = new Date();
        const clockKey = turn === "w" ? "whiteTimeLeft" : "blackTimeLeft";
        const previousTimeLeft = game[clockKey];
        let timeLeft: number | null = previousTimeLeft;
        if (previousTimeLeft != null) {
            const elapsed = Math.max(0, now.getTime() - (game.lastMoveAt ?? now).getTime());
            timeLeft = previousTimeLeft - elapsed;
            if (timeLeft <= 0) {
                const finished = await this.finishGame(gameId, "TIMEOUT", opponentId, turn);
                const gameOver = await this.buildGameOverEvent(gameId);
                return {
                    ok: false,
                    status: 409,
                    error: finished ? "Temps écoulé" : "La partie est terminée",
                    isBotGame,
                    gameOver: gameOver ?? undefined,
                };
            }
        }

        // Legality
        const chess = new Chess(game.currentFen);
        let applied;
        try {
            applied = chess.move({ from: input.from, to: input.to, promotion: input.promotion });
        } catch {
            return { ok: false, status: 400, error: "Coup invalide", isBotGame };
        }
        const newFen = chess.fen();

        // Outcome (threefold repetition needs the move history: chess.js only sees the FEN here)
        const previousMoves = await prisma.move.findMany({ where: { gameId }, select: { fen: true } });
        const moveNumber = previousMoves.length + 1;
        const outcome = detectOutcome(chess, turn, moverId, newFen, previousMoves.map((m) => m.fen));

        const captured = normalizeCaptured(game.capturedPieces);
        if (applied.captured) captured[turn === "w" ? "white" : "black"].push(applied.captured);

        try {
            await prisma.$transaction(async (tx) => {
                // Optimistic lock: only succeeds if nobody moved since we read the position.
                const updated = await tx.game.updateMany({
                    where: { id: gameId, status: "IN_PROGRESS", currentFen: game.currentFen },
                    data: {
                        currentFen: newFen,
                        capturedPieces: captured as unknown as Prisma.InputJsonValue,
                        lastMoveAt: now,
                        ...(timeLeft != null ? { [clockKey]: timeLeft } : {}),
                    },
                });
                if (updated.count !== 1) throw new ConflictError();

                await tx.move.create({
                    data: {
                        gameId,
                        moveNumber,
                        from: applied.from,
                        to: applied.to,
                        promotion: applied.promotion ?? null,
                        capturedPiece: applied.captured ?? null,
                        fen: newFen,
                    },
                });

                if (outcome) await finishInTx(tx, gameId, outcome.result, outcome.winnerId);
            });
        } catch (error) {
            if (error instanceof ConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
                return { ok: false, status: 409, error: "La position a changé, resynchronisation nécessaire", isBotGame };
            }
            throw error;
        }

        const clocks = {
            whiteTimeLeft: turn === "w" ? timeLeft : game.whiteTimeLeft,
            blackTimeLeft: turn === "b" ? timeLeft : game.blackTimeLeft,
        };
        const move: MoveEvent = {
            from: applied.from,
            to: applied.to,
            promotion: applied.promotion,
            capturedPiece: applied.captured,
            fen: newFen,
            moveNumber,
            ...clocks,
        };

        return {
            ok: true,
            isBotGame,
            move,
            gameOver: outcome
                ? { result: outcome.result, winnerId: outcome.winnerId, finalFen: newFen, ...clocks }
                : undefined,
        };
    }

    /**
     * Ends the game on time if the clock of the player to move really ran out.
     * Safe to call from either client: it is idempotent and verified server-side.
     */
    static async claimTimeout(gameId: string): Promise<TimeoutResult> {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            select: {
                status: true,
                currentFen: true,
                playerWhiteId: true,
                playerBlackId: true,
                botId: true,
                whiteTimeLeft: true,
                blackTimeLeft: true,
                lastMoveAt: true,
            },
        });
        if (!game) return { ok: false, status: 404, error: "Partie introuvable" };
        if (game.status !== "IN_PROGRESS") return { ok: false, status: 409, error: "La partie n'est pas en cours" };
        if (game.whiteTimeLeft == null && game.blackTimeLeft == null) {
            return { ok: false, status: 400, error: "Cette partie n'a pas de limite de temps" };
        }

        const turn = turnOf(game.currentFen);
        const clocks = liveClocks(game);
        const remaining = turn === "w" ? clocks.whiteTimeLeft : clocks.blackTimeLeft;
        if (remaining == null || remaining > 0) {
            return { ok: false, status: 409, error: "Le temps n'est pas écoulé" };
        }

        const whiteId = game.playerWhiteId ?? game.botId;
        const blackId = game.playerBlackId ?? game.botId;
        const winnerId = (turn === "w" ? blackId : whiteId) ?? null;

        await this.finishGame(gameId, "TIMEOUT", winnerId, turn);
        const gameOver = await this.buildGameOverEvent(gameId);
        if (!gameOver) return { ok: false, status: 404, error: "Partie introuvable" };
        return { ok: true, gameOver };
    }

    /**
     * Marks the game as finished. Idempotent: only the call that actually flips the status updates
     * the ratings. Returns true when this call ended the game.
     */
    static async finishGame(
        gameId: string,
        result: GameResult,
        winnerId: string | null,
        zeroClockOf?: Color
    ): Promise<boolean> {
        return prisma.$transaction((tx) => finishInTx(tx, gameId, result, winnerId, zeroClockOf));
    }

    /** Saves a chat message authored by a participant. */
    static async postChatMessage(gameId: string, userId: string, text: string): Promise<ChatMessage | null> {
        const message = text.trim().slice(0, CHAT_MAX_LENGTH);
        if (!message || !(await this.isParticipant(gameId, userId))) return null;
        const saved = await prisma.chatMessage.create({ data: { gameId, userId, message } });
        return { id: saved.id, userId: saved.userId, message: saved.message, sentAt: saved.sentAt.toISOString() };
    }

    private static async buildGameOverEvent(gameId: string): Promise<GameOverEvent | null> {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            select: { result: true, winnerId: true, currentFen: true, whiteTimeLeft: true, blackTimeLeft: true },
        });
        if (!game?.result) return null;
        return {
            result: game.result,
            winnerId: game.winnerId,
            finalFen: game.currentFen,
            whiteTimeLeft: game.whiteTimeLeft,
            blackTimeLeft: game.blackTimeLeft,
        };
    }
}

function normalizeCaptured(value: Prisma.JsonValue): { white: string[]; black: string[] } {
    const v = (value ?? {}) as { white?: unknown; black?: unknown };
    return {
        white: Array.isArray(v.white) ? [...(v.white as string[])] : [],
        black: Array.isArray(v.black) ? [...(v.black as string[])] : [],
    };
}

function generateGameCode(length = 8) {
    let code = "";
    for (let i = 0; i < length; i++) code += GAME_CODE_ALPHABET[randomInt(GAME_CODE_ALPHABET.length)];
    return code;
}

function detectOutcome(
    chess: Chess,
    mover: Color,
    moverId: string,
    newFen: string,
    previousFens: string[]
): { result: GameResult; winnerId: string | null } | null {
    if (chess.isCheckmate()) {
        return { result: mover === "w" ? "WHITE_WIN" : "BLACK_WIN", winnerId: moverId };
    }
    if (chess.isStalemate()) return { result: "STALEMATE", winnerId: null };
    if (chess.isInsufficientMaterial() || chess.isDrawByFiftyMoves()) return { result: "DRAW", winnerId: null };

    const key = positionKey(newFen);
    // The starting position is not stored with the moves but counts as the first occurrence.
    const occurrences = [INITIAL_FEN, ...previousFens].filter((f) => positionKey(f) === key).length + 1;
    if (occurrences >= 3) return { result: "REPETITION", winnerId: null };

    return null;
}

async function finishInTx(
    tx: Tx,
    gameId: string,
    result: GameResult,
    winnerId: string | null,
    zeroClockOf?: Color
): Promise<boolean> {
    const { count } = await tx.game.updateMany({
        where: { id: gameId, status: { not: "FINISHED" } },
        data: {
            status: "FINISHED",
            result,
            winnerId,
            finishedAt: new Date(),
            ...(zeroClockOf === "w" ? { whiteTimeLeft: 0 } : {}),
            ...(zeroClockOf === "b" ? { blackTimeLeft: 0 } : {}),
        },
    });
    if (count !== 1) return false;

    await applyRatings(tx, gameId, winnerId);
    return true;
}

/** Elo update for human-vs-human games, based on who actually won (timeouts and resignations included). */
async function applyRatings(tx: Tx, gameId: string, winnerId: string | null) {
    const game = await tx.game.findUnique({
        where: { id: gameId },
        select: { playerWhiteId: true, playerBlackId: true, botId: true },
    });
    if (!game || game.botId || !game.playerWhiteId || !game.playerBlackId) return;

    const [white, black] = await Promise.all([
        tx.user.findUnique({ where: { id: game.playerWhiteId }, select: { id: true, elo: true } }),
        tx.user.findUnique({ where: { id: game.playerBlackId }, select: { id: true, elo: true } }),
    ]);
    if (!white || !black) return;

    const scoreWhite = winnerId === white.id ? 1 : winnerId === black.id ? 0 : 0.5;
    const scoreBlack = 1 - scoreWhite;
    const expectedWhite = 1 / (1 + Math.pow(10, (black.elo - white.elo) / 400));
    const expectedBlack = 1 - expectedWhite;

    const newWhite = Math.round(white.elo + ELO_K * (scoreWhite - expectedWhite));
    const newBlack = Math.round(black.elo + ELO_K * (scoreBlack - expectedBlack));

    await tx.user.update({ where: { id: white.id }, data: { elo: { increment: newWhite - white.elo } } });
    await tx.user.update({ where: { id: black.id }, data: { elo: { increment: newBlack - black.elo } } });
    await tx.ratingHistory.createMany({
        data: [
            { userId: white.id, gameId, oldElo: white.elo, newElo: newWhite },
            { userId: black.id, gameId, oldElo: black.elo, newElo: newBlack },
        ],
    });
}
