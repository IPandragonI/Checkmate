"use client";

import {apiFetch} from "@/lib/api";
import React, {useState} from 'react';
import Footer from '@/app/components/ui/Footer';

export default function ContactPage() {
    const [subject, setSubject] = useState('Erreur / Question depuis le formulaire de contact');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!subject || subject.length < 3) {
            setError('Le sujet doit contenir au minimum 3 caractères.');
            return;
        }
        if (!message || message.length < 10) {
            setError('Le message doit contenir au minimum 10 caractères.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/send-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({subject: subject, text: message}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data && data.error) || 'Erreur serveur');
            setSuccess(true);
            setMessage('');
        } catch (err) {
            const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
            setError(msg || 'Erreur lors de l\'envoi');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="p-6 space-y-6 text-base-content">
            <h1 className="text-3xl font-bold">Contact</h1>

            <div className="rounded-xl bg-base-200 shadow p-6 space-y-4 w-full">
                <p>Si tu as une question ou veux nous signaler un problème, utilise ce formulaire.</p>

                <form onSubmit={handleSubmit}>
                    <fieldset className="fieldset p-4 w-full">

                        <label className="label">Sujet</label>
                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                               className="input input-bordered w-1/2" placeholder="Sujet du message"/>


                        <label className="label">Message</label>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                                  className="textarea textarea-bordered w-1/2 h-24" rows={6}/>

                        {error && <p className="text-red-500">{error}</p>}
                        {success && <p className="text-success">Message envoyé avec succès !</p>}

                        <div className="flex items-center gap-4 mt-10">
                            <button className="btn btn-primary" disabled={loading}>
                                {loading ? 'Envoi...' : 'Envoyer'}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => {
                                setSubject('Erreur / Question depuis le formulaire de contact');
                                setMessage('');
                                setError(null);
                            }}>
                                Réinitialiser
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>

            <Footer/>
        </main>
    );
}
