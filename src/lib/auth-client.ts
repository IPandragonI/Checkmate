import { useEffect, useMemo, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { useGuest } from "@/lib/guest/GuestProvider";
import { isGuestActive } from "@/lib/guest/mode";
import { guestUser, loadGuestData } from "@/lib/guest/store";

const client = createAuthClient({
    plugins: [usernameClient()],
});

export const { signIn, signUp, isUsernameAvailable, sendVerificationEmail } = client;

type SessionResult = ReturnType<typeof client.useSession>;

/**
 * Same contract as Better Auth's `useSession`, but in guest mode (no database or "play as guest")
 * it returns a local guest user and never calls the auth API.
 */
export function useSession(): SessionResult {
    const { dbAvailable, isGuest, ready } = useGuest();
    const guestMode = isGuest || !dbAvailable;
    const [profileVersion, setProfileVersion] = useState(0);

    useEffect(() => {
        const bump = () => setProfileVersion((v) => v + 1);
        window.addEventListener("checkmate:guest-updated", bump);
        return () => window.removeEventListener("checkmate:guest-updated", bump);
    }, []);

    // `dbAvailable` is constant for a deployment, so the hook order never changes between renders.
    const real = dbAvailable ? client.useSession() : null;

    const guestSession = useMemo(() => {
        if (!guestMode) return null;
        const user = guestUser(loadGuestData());
        return { user, session: { id: "guest-session", userId: user.id } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guestMode, ready, profileVersion]);

    if (guestMode) {
        return { data: guestSession, isPending: !ready, error: null, refetch: async () => {} } as unknown as SessionResult;
    }
    return real as SessionResult;
}

export async function signOut(...args: Parameters<typeof client.signOut>) {
    if (isGuestActive()) return; // guests leave through GuestProvider.exitGuest
    return client.signOut(...args);
}
