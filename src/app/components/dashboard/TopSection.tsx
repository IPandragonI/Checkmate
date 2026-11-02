"use client";

import Link from "next/link";
import {useGuest} from "@/lib/guest/GuestProvider";
import {Swords, UsersRound} from "lucide-react";

function TopSection({user}: { user?: any }) {
    const {isGuest} = useGuest();
    return (
        <div className="bg-base-200 rounded-xl h-32 flex text-2xl font-bold p-6">
            <div className="flex flex-col justify-center flex-1">
                <p className="text-base md:text-2xl font-bold">Bonjour, {user?.name} !</p>
                <Link href="/profile" className="mt-2 inline-block text-primary hover:underline text-sm">Voir mon
                    profil</Link>
            </div>
            <div className="flex items-center justify-center">

            </div>
            <div className="flex flex-col items-center justify-center gap-2">
                <Link className="btn btn-primary w-full" href={"/games/create"}>
                    <div className="hidden md:block">Créer une partie</div>
                    <Swords className="md:hidden" size={20}/>
                </Link>
                {!isGuest && (
                    <Link className="btn btn-secondary w-full" href={"/games/join"}>
                        <div className="hidden md:block">Rejoindre une partie</div>
                        <UsersRound className="md:hidden" size={20}/>
                    </Link>
                )}
            </div>
        </div>
    );
}

export default TopSection;