import Pusher from "pusher";

let client: Pusher | null = null;

export function getPusher(): Pusher {
    if (client) return client;
    const { PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env;
    if (!PUSHER_APP_ID || !NEXT_PUBLIC_PUSHER_KEY || !PUSHER_SECRET || !NEXT_PUBLIC_PUSHER_CLUSTER) {
        throw new Error("Pusher is not configured (PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER)");
    }
    client = new Pusher({
        appId: PUSHER_APP_ID,
        key: NEXT_PUBLIC_PUSHER_KEY,
        secret: PUSHER_SECRET,
        cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
        useTLS: true,
    });
    return client;
}

export function gameChannelName(gameId: string) {
    return `private-game-${gameId}`;
}

export interface GameEvent {
    name: "start" | "move" | "gameOver" | "message";
    data: unknown;
}

/**
 * Publishes events to a game channel, in order. The database is the source of truth and
 * clients resync on reconnect, so a delivery failure is logged but never fails the request.
 */
export async function publishGameEvents(gameId: string, events: GameEvent[]) {
    if (events.length === 0) return;
    try {
        const channel = gameChannelName(gameId);
        await getPusher().triggerBatch(events.map((e) => ({ channel, name: e.name, data: e.data as object })));
    } catch (error) {
        console.error("Failed to publish game events:", error);
    }
}
