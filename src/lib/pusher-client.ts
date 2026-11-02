"use client";

import Pusher from "pusher-js";

let client: Pusher | null = null;

export function getPusherClient(): Pusher {
    if (!client) {
        client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
        });
    }
    return client;
}

export function gameChannelName(gameId: string) {
    return `private-game-${gameId}`;
}
