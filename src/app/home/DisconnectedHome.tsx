"use client";

import Link from "next/link";
import {useGuest} from "@/lib/guest/GuestProvider";

const DisconnectedHome = () => {
    const {enterGuest} = useGuest();
    return (
        <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <h1 className="text-4xl font-bold tracking-wider text-primary">Bienvenue sur Checkmate</h1>
            <p>Pour pouvoir créer ou rejoindre une partie, veuillez vous connecter ou vous inscrire.</p>
            <Link className="btn btn-primary btn-lg btn-wide" href={"/auth/login-or-register"}>Se connecter / S'inscrire</Link>
            <button className="btn btn-outline btn-secondary btn-wide" onClick={enterGuest}>Jouer en invité (sans compte)</button>
            <p className="text-sm text-base-content/60 max-w-md">Le mode invité fonctionne entièrement dans votre navigateur : parties contre les bots et problèmes, sauvegardés sur cet appareil. Les parties en ligne nécessitent un compte.</p>
        </div>
    )
}

export default DisconnectedHome;