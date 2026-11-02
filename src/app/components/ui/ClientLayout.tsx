"use client";

import {Sidebar, MenuOpener} from "@/app/components/ui/Sidebar";
import ThemeProvider from "@/app/components/ui/ThemeProvider";
import {useSession} from "@/lib/auth-client";
import {GuestProvider} from "@/lib/guest/GuestProvider";
import FullScreenLoader from "@/app/utils/FullScreenLoader";
import {usePathname, useRouter} from "next/navigation";
import {useEffect} from "react";
import {Menu} from "lucide-react";

function AuthGuard({children}: { children: React.ReactNode }) {
    const {data: session, isPending} = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const isNotAllowed = !isPending && !session?.user && pathname !== "/auth/login-or-register" && pathname !== "/";

    useEffect(() => {
        if (isNotAllowed) {
            router.push("/");
        }
    }, [isNotAllowed, router]);

    if (isPending) {
        return <FullScreenLoader/>;
    }

    if (isNotAllowed) {
        return null;
    }

    if (!isPending && !session?.user) {
        return (
            <ThemeProvider>
                <main className="min-h-screen w-full overflow-hidden bg-base-100 text-base">
                    {children}
                </main>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <Sidebar>
                <MenuOpener/>
                <main className="min-h-screen w-full overflow-hidden bg-base-100 text-base-content">
                    {children}
                </main>
            </Sidebar>
        </ThemeProvider>
    );
}

export default function ClientLayout({children, dbConfigured}: { children: React.ReactNode, dbConfigured: boolean }) {
    return (
        <GuestProvider dbConfigured={dbConfigured}>
            <AuthGuard>{children}</AuthGuard>
        </GuestProvider>
    );
}
