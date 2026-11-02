/**
 * Guest mode: the app runs entirely in the browser (no database, no account).
 * It is active when the deployment has no database configured, or when the visitor chose "play as guest".
 */
export const GUEST_FLAG_KEY = "checkmate.guest";
export const GUEST_USER_ID = "guest";

let dbAvailable = true;

export function configureGuestMode(databaseConfigured: boolean) {
    dbAvailable = databaseConfigured;
}

export function isDatabaseAvailable() {
    return dbAvailable;
}

export function isGuestActive(): boolean {
    if (!dbAvailable) return true;
    try {
        return typeof window !== "undefined" && window.localStorage.getItem(GUEST_FLAG_KEY) === "1";
    } catch {
        return false;
    }
}

export function setGuestFlag(on: boolean) {
    try {
        if (on) window.localStorage.setItem(GUEST_FLAG_KEY, "1");
        else window.localStorage.removeItem(GUEST_FLAG_KEY);
    } catch {
        // storage unavailable: the flag only lives for this page load
    }
}
