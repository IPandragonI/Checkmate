"use client";

import Link from "next/link";
import {useGuest} from "@/lib/guest/GuestProvider";
import {APP_TITLE} from "@/lib/constants";
import {Crown, Menu, Swords, UsersRound, Star, BookOpen, BadgeQuestionMark, Puzzle} from 'lucide-react';

function Sidebar({children}: { children: React.ReactNode }) {
    const {isGuest} = useGuest();
    const allMenuItems = [
        {name: "Créer une partie", href: "/games/create", icon: Swords},
        {name: "Rejoindre une partie", href: "/games/join", icon: UsersRound},
        {name: "Problèmes", href: "/puzzles", icon: Puzzle},
        {name: "Classement", href: "/leaderboard", icon: Star},
    ];
    // Online play and the leaderboard need the database
    const menuItems = isGuest ? allMenuItems.filter((item) => item.href !== "/games/join" && item.href !== "/leaderboard") : allMenuItems;

    const bottomMenuItems = [
        {name: "Règles", href: "/rules", icon: BookOpen},
        {name: "Aide", href: "/help", icon: BadgeQuestionMark},
    ];

    return (
        <aside className="drawer lg:drawer-open">
            <input id="my-drawer-2" type="checkbox" className="drawer-toggle"/>
            <div className="drawer-content flex flex-col items-center justify-center">
                {children}
            </div>
            <div className="drawer-side">
                <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
                <ul className="menu text-base-content min-h-full w-3/4 lg:w-full py-6 px-2 lg:px-6 bg-base-300 border-0">
                    <li>
                        <Link className="flex items-center justify-center py-2" href="/">
                            <Crown className="inline-block mr-2 text-primary/80" size={28}/>
                            <span className="text-2xl font-extrabold text-primary tracking-wide">{APP_TITLE}</span>
                        </Link>
                    </li>
                    {isGuest && <li className="text-center"><span className="badge badge-outline badge-secondary mx-auto">Mode invité · hors ligne</span></li>}
                    <div className="divider my-2"></div>
                    <section className="flex flex-col justify-between flex-1">
                        <div>
                        {menuItems.map((item) => (
                            <li key={item.name}>
                                <Link href={item.href}>
                                    <item.icon className="inline-block mr-2 text-primary" size={18}/>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                        </div>
                        <div>
                            {bottomMenuItems.map((item) => (
                                <li key={item.name}>
                                    <Link href={item.href}>
                                        <item.icon className="inline-block mr-2 text-secondary" size={18}/>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </div>
                    </section>
                </ul>
            </div>
        </aside>
    );
}

const MenuOpener = () => (
    <div className={"absolute top-10 left-5 z-50"}>
        <label htmlFor="my-drawer-2" className="btn btn-ghost drawer-button lg:hidden">
            <Menu size={20}/>
        </label>
    </div>
);

export {Sidebar, MenuOpener};
