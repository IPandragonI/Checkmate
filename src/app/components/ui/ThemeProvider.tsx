"use client";
import { useEffect, useState } from "react";
import { useGuest } from "@/lib/guest/GuestProvider";
import { loadGuestData } from "@/lib/guest/store";

export default function ThemeProvider({ children, theme: initialTheme }: { children: React.ReactNode, theme?: string }) {
    const [theme, setTheme] = useState(initialTheme || "winter");

    const { isGuest } = useGuest();

    // Guests keep their theme in the browser
    useEffect(() => {
        if (!isGuest) return;
        const saved = loadGuestData().theme;
        if (saved) setTheme(saved);
    }, [isGuest]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            document.body.setAttribute("data-theme", theme);
        }
    }, [theme]);

    return <>{children}</>;
}
