import { guestFetch } from "@/lib/guest/api";
import { isGuestActive } from "@/lib/guest/mode";

/** `fetch` for the app's own API: answered locally in guest mode, sent to the server otherwise. */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
    return isGuestActive() ? guestFetch(input, init) : fetch(input, init);
}
