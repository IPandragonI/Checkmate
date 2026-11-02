"use client";

import {Bell} from "lucide-react";
import Link from "next/link";
import {useSession, signOut} from "@/lib/auth-client";
import Swal from 'sweetalert2'
import {useRouter} from "next/navigation";
import {useGuest} from "@/lib/guest/GuestProvider";

export default function Topbar() {
    const {user} = useSession().data || {};
    const router = useRouter();
    const {isGuest, dbAvailable, exitGuest} = useGuest();

    function handleLogout() {
        if (isGuest) {
            exitGuest();
            router.push("/");
            return;
        }
        Swal.fire({
            title: 'Déconnexion',
            text: 'Voulez-vous vraiment vous déconnecter ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, déconnecter',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                signOut();
                router.push("/");
            }
        });
    }

    return (
        <div className="w-full flex justify-end items-center p-2 lg:p-4">
            <div className="flex items-center justify-end gap-4 p-4">
                <button className="btn btn-circle" aria-label="Notifications">
                    <Bell size={24}/>
                </button>
                {user && (
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                            <div className="w-10 rounded-full">
                                {user?.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={user?.image} alt="User Avatar" className="rounded-full object-cover w-10 h-10"/>
                                ) : (
                                    <span className="text-lg">
                                {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                            </span>
                                )}
                            </div>
                        </div>
                        <ul tabIndex={0}
                            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
                            <li><Link href="/profile">Profil</Link></li>
                            {(!isGuest || dbAvailable) && (
                                <li>
                                    <button onClick={handleLogout}>{isGuest ? "Quitter le mode invité" : "Se déconnecter"}</button>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

