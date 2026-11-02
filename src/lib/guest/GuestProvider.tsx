"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearGuestData } from "@/lib/guest/store";
import { configureGuestMode, isGuestActive, setGuestFlag } from "@/lib/guest/mode";

interface GuestContextValue {
    /** True when the deployment has a database (accounts and online play are possible). */
    dbAvailable: boolean;
    /** True when the app currently runs in the browser-only guest mode. */
    isGuest: boolean;
    /** False until the stored choice has been read on the client. */
    ready: boolean;
    enterGuest: () => void;
    exitGuest: () => void;
    resetGuestData: () => void;
}

const GuestContext = createContext<GuestContextValue>({
    dbAvailable: true,
    isGuest: false,
    ready: true,
    enterGuest: () => {},
    exitGuest: () => {},
    resetGuestData: () => {},
});

export function GuestProvider({ dbConfigured, children }: { dbConfigured: boolean; children: React.ReactNode }) {
    // Must happen during render: children's effects (API calls) run before this component's effects.
    configureGuestMode(dbConfigured);

    const [isGuest, setIsGuest] = useState(!dbConfigured);
    const [ready, setReady] = useState(!dbConfigured);

    useEffect(() => {
        setIsGuest(isGuestActive());
        setReady(true);
    }, []);

    const enterGuest = useCallback(() => {
        setGuestFlag(true);
        setIsGuest(true);
    }, []);

    const exitGuest = useCallback(() => {
        if (!dbConfigured) return; // without a database there is nothing else to go back to
        setGuestFlag(false);
        setIsGuest(false);
    }, [dbConfigured]);

    const resetGuestData = useCallback(() => {
        clearGuestData();
        window.location.assign("/");
    }, []);

    const value = useMemo(
        () => ({ dbAvailable: dbConfigured, isGuest, ready, enterGuest, exitGuest, resetGuestData }),
        [dbConfigured, isGuest, ready, enterGuest, exitGuest, resetGuestData]
    );

    return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export const useGuest = () => useContext(GuestContext);
