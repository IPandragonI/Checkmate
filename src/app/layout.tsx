import "./globals.css";
import {connection} from "next/server";
import ClientLayout from "@/app/components/ui/ClientLayout";

export default async function Layout({children}: { children: React.ReactNode }) {
    // Read at request time (not build time): without DATABASE_URL the app runs in browser-only guest mode.
    await connection();
    const dbConfigured = !!process.env.DATABASE_URL;

    return (
        <html lang="fr">
        <head>
            <title>Checkmate - Jeu d'échecs en ligne</title>
            <meta name="description" content="Application de jeu d'échecs"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <link rel="icon" href="/favicon.ico"/>
        </head>
        <body>
        <ClientLayout dbConfigured={dbConfigured}>{children}</ClientLayout>
        </body>
        </html>
    );
}
