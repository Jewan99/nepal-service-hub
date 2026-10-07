import React, { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { categories } from '../data/categories';
import { useAuth } from '../context/AuthContext';
import { db, firebaseReady } from '../firebase';
import { readLocalWorkerListings, saveLocalWorkerListing } from '../utils/workerDirectory';

const units = ['visit', 'hour', 'day', 'month', 'session', 'event'];

export default function WorkerSetup() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: profile?.name || user?.displayName || '',
        category: categories[0].id,
        city: '',
        rate: '',
        unit: 'visit',
        bio: '',
        verified: false,
    });
    const [loading, setLoading] = useState(firebaseReady);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.uid) return undefined;
        if (!firebaseReady) {
            const existing = readLocalWorkerListings()[user.uid];
            if (existing) setForm((current) => ({ ...current, ...existing, rate: String(existing.rate) }));
            setLoading(false);
            return undefined;
        }
        getDoc(doc(db, 'workers', user.uid)).then((snapshot) => {
            if (snapshot.exists()) setForm((current) => ({ ...current, ...snapshot.data(), rate: String(snapshot.data().rate) }));
            setLoading(false);
        }).catch(() => {
            setError('Could not load your worker profile.');
            setLoading(false);
        });
        return undefined;
    }, [user?.uid]);

    function update(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        const rate = Number(form.rate);
        if (!form.name.trim() || !form.city.trim() || !form.bio.trim() || !Number.isFinite(rate) || rate < 0 || rate > 200000) {
            setError('Complete every field and enter a rate between Rs 0 and Rs 200,000.');
            return;
        }

        const listing = {
            name: form.name.trim(),
            category: form.category,
            city: form.city.trim(),
            rate,
            unit: form.unit,
            bio: form.bio.trim(),
            verified: Boolean(form.verified),
        };
        setBusy(true);
        try {
            if (firebaseReady) {
                const listingRef = doc(db, 'workers', user.uid);
                const existing = await getDoc(listingRef);
                await setDoc(listingRef, {
                    ...listing,
                    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            } else {
                saveLocalWorkerListing(user.uid, listing);
            }
            navigate(`/worker/${user.uid}`);
        } catch (saveError) {
            setError(saveError.message || 'Could not publish your worker profile.');
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="container section">Loading your profile…</div>;

    return (
        <main className="container account-page worker-setup-page">
            <div className="account-heading">
                <p className="eyebrow-light">WORKER PROFILE</p>
                <h1>Get listed. Get messages.</h1>
                <p>Your listing is connected to your account, so customers can contact you directly.</p>
            </div>
            <form className="worker-setup-form" onSubmit={handleSubmit} noValidate>
                <div className="field">
                    <label htmlFor="worker-name">Display name</label>
                    <input id="worker-name" value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={80} required />
                </div>
                <div className="field">
                    <label htmlFor="worker-category">Service category</label>
                    <select id="worker-category" value={form.category} onChange={(event) => update('category', event.target.value)}>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="worker-city">City and neighborhood</label>
                    <input id="worker-city" value={form.city} onChange={(event) => update('city', event.target.value)} maxLength={80} placeholder="Kathmandu, Baneshwor" required />
                </div>
                <div className="worker-rate-fields">
                    <div className="field">
                        <label htmlFor="worker-rate">Starting rate (Rs)</label>
                        <input id="worker-rate" type="number" min="0" max="200000" value={form.rate} onChange={(event) => update('rate', event.target.value)} required />
                    </div>
                    <div className="field">
                        <label htmlFor="worker-unit">Rate per</label>
                        <select id="worker-unit" value={form.unit} onChange={(event) => update('unit', event.target.value)}>
                            {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="worker-bio">About your work</label>
                    <textarea id="worker-bio" value={form.bio} onChange={(event) => update('bio', event.target.value)} maxLength={600} rows={4} required />
                </div>
                {error && <div className="form-error-banner" role="alert">{error}</div>}
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish worker profile'}</button>
            </form>
        </main>
    );
}