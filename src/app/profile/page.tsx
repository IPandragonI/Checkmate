"use client";

import {apiFetch} from "@/lib/api";
import {useEffect, useState} from "react";
import {useSession} from "@/lib/auth-client";
import {useGuest} from "@/lib/guest/GuestProvider";
import FullScreenLoader from "@/app/utils/FullScreenLoader";
import Footer from "@/app/components/ui/Footer";
import {sendVerificationEmail} from "@/lib/auth-client";

export default function ProfilePage() {
    const {data: session, isPending} = useSession();
    const {isGuest, resetGuestData} = useGuest();
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<string>("light");
    const [loadingPref, setLoadingPref] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [sendingVerification, setSendingVerification] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [userName, setUserName] = useState<string>("");
    const [userUsername, setUserUsername] = useState<string>("");
    const [userImage, setUserImage] = useState<string>("");

    useEffect(() => {
        async function fetchPreference() {
            setLoadingPref(true);
            try {
                const res = await apiFetch("/api/user-preference");
                if (!res.ok) throw new Error("Erreur lors de la récupération des préférences");
                const data = await res.json();
                if (data.preference?.theme) {
                    setTheme(data.preference.theme);
                    document.body.setAttribute("data-theme", data.preference.theme);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoadingPref(false);
            }
        }
        fetchPreference();
    }, []);

    useEffect(() => {
        if (session?.user) {
            setUserName(session.user.name || "");
            setUserUsername(session.user.username || "");
            setUserImage(session.user.image || "");
        }
    }, [session]);

    async function savePreferences() {
        setSaving(true);
        setSuccess(false);
        setError(null);
        try {
            const res = await apiFetch("/api/user-preference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme }),
            });
            if (!res.ok) throw new Error("Erreur lors de la sauvegarde des préférences");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
            document.body.setAttribute("data-theme", theme);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    if (isPending || loadingPref || !session?.user) return <FullScreenLoader />;

    const {user} = session;

    async function sendVerificationEmailWithBetterAuth() {
        setVerificationMessage(null);
        setSendingVerification(true);
        try {
            await sendVerificationEmail({
                email: user.email
            });
            setVerificationMessage('Email de vérification envoyé ! Vérifiez votre boîte de réception.');
        } catch (err) {
            const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
            setVerificationMessage(msg || 'Erreur lors de l\'envoi');
        } finally {
            setSendingVerification(false);
        }
    }

    async function saveProfileEdits() {
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName, username: userUsername, image: userImage })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Erreur lors de la mise à jour du profil');
            }
            setIsEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);

        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="p-6 space-y-4 text-base-content">
            <h1 className="text-3xl font-bold mb-10">Profil</h1>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex flex-col lg:flex-row items-stretch gap-6">

                <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-base-200 shadow w-full lg:w-1/3">
                    <p className="text-lg font-semibold">{userName}</p>
                    <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full flex items-center justify-center text-3xl">
                            {userImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={userImage} alt="Avatar" className="rounded-full w-full object-cover" />
                            ) : (
                                <span>
                                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>


                <div className="flex flex-col gap-4 p-6 rounded-xl bg-base-200 shadow w-full lg:w-2/3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Bio &amp; détails</h2>
                        <div>
                            {!isEditing ? (
                                <button className="btn btn-sm" onClick={() => setIsEditing(true)}>Éditer</button>
                            ) : (
                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-outline" onClick={() => {
                                        setIsEditing(false);
                                        setUserName(user.name || "");
                                        setUserUsername(user.username || "");
                                        setUserImage(user.image || "");
                                    }}>Annuler</button>
                                    <button className="btn btn-sm btn-primary" onClick={saveProfileEdits} disabled={saving}>
                                        {saving ? (
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                        ) : null}
                                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium text-slate-500">Nom complet</h3>
                            {!isEditing ? <p>{userName}</p> : (
                                <input className="input input-bordered w-full" value={userName} onChange={(e) => setUserName(e.target.value)} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-500">Nom d'utilisateur</h3>
                            {!isEditing ? <p>{userUsername}</p> : (
                                <input className="input input-bordered w-full" value={userUsername} onChange={(e) => setUserUsername(e.target.value)} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-500">Email</h3>
                            <p>{user.email}</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-500">Email vérifié</h3>
                            <p>{user.emailVerified ? "Oui" : "Non"}</p>
                            {!user.emailVerified && (
                                <div className="mt-2">
                                    <button
                                        className="btn btn-sm btn-outline"
                                        onClick={sendVerificationEmailWithBetterAuth}
                                        disabled={sendingVerification}
                                    >
                                        {sendingVerification ? (
                                            <span className="loading loading-spinner loading-sm mr-2"></span>
                                        ) : null}
                                        {sendingVerification ? "Envoi..." : "Envoyer un email de vérification"}
                                    </button>
                                    {verificationMessage && (
                                        <p className="mt-2 text-sm">{verificationMessage}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-500">URL de l'image de profil</h3>
                            {!isEditing ? <p className="truncate">{userImage || "Aucune"}</p> : (
                                <input className="input input-bordered w-full" value={userImage} onChange={(e) => setUserImage(e.target.value)} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-500">Inscrit depuis</h3>
                            <p>{new Date(user.createdAt).toLocaleDateString("fr")}</p>
                        </div>
                    </div>

                    {/*Si temps*/}
                    {/*<div className="mt-4">*/}
                    {/*    <a href="/auth/change-password" className="text-blue-500 hover:underline">*/}
                    {/*        Changer le mot de passe*/}
                    {/*    </a>*/}
                    {/*</div>*/}
                </div>
            </div>
            <div className="flex flex-col gap-4 p-6 rounded-xl bg-base-200 shadow w-full">
                <h2 className="text-lg font-semibold">Préférences</h2>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <label htmlFor="theme" className="font-medium text-slate-500 min-w-[120px]">
                        Thème
                    </label>
                    <select id="theme" className="select select-bordered w-full max-w-xs" value={theme} onChange={(e) => setTheme(e.target.value)}>
                        <option value="corporate">Corporate</option>
                        <option value="valentine">Valentine</option>
                        <option value="lofi">Lofi</option>
                        <option value="night">Night</option>
                        <option value="winter">Winter</option>
                    </select>
                </div>


                <div className="mt-4 flex items-center gap-4">
                    <button className="btn btn-primary" onClick={savePreferences} disabled={saving}>
                        {saving ? (
                            <span className="loading loading-spinner loading-sm mr-2"></span>
                        ) : null}
                        {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
                    </button>
                    {success && (
                        <span className="text-success font-semibold">Préférences sauvegardées !</span>
                    )}
                </div>
            </div>
            {isGuest && (
                <div className="flex flex-col gap-3 p-6 rounded-xl bg-base-200 shadow w-full">
                    <h2 className="text-lg font-semibold">Mode invité</h2>
                    <p className="text-sm text-slate-500">Vos parties, vos problèmes résolus et vos préférences sont enregistrés uniquement dans ce navigateur.</p>
                    <button className="btn btn-error btn-outline w-fit" onClick={() => { if (window.confirm("Supprimer toutes les données invité de cet appareil ?")) resetGuestData(); }}>
                        Réinitialiser les données invité
                    </button>
                </div>
            )}
            <Footer />
        </main>
    );
}