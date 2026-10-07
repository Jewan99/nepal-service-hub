import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import WorkerCard from '../components/WorkerCard';
import { mockWorkers } from '../data/mockWorkers';
import { useAuth } from '../context/AuthContext';
import { readSavedWorkers } from '../utils/savedWorkers';

export default function SavedProviders() {
    const { user } = useAuth();
    const [savedIds, setSavedIds] = useState(() => readSavedWorkers(user?.uid));

    useEffect(() => {
        const scope = user?.uid || 'guest';
        const syncSaved = (event) => {
            if (!event || event.detail?.scope === scope) setSavedIds(readSavedWorkers(scope));
        };
        syncSaved();
        window.addEventListener('saved-workers-changed', syncSaved);
        return () => window.removeEventListener('saved-workers-changed', syncSaved);
    }, [user?.uid]);

    const savedWorkers = mockWorkers.filter((worker) => savedIds.includes(worker.id));

    return (
        <main className="container section saved-page">
            <div className="section-head">
                <div><span className="section-kicker">YOUR SHORTLIST</span><h1>Saved providers</h1></div>
                <p>{savedWorkers.length} saved</p>
            </div>
            {savedWorkers.length ? (
                <div className="worker-grid">
                    {savedWorkers.map((worker) => <WorkerCard key={worker.id} worker={worker} />)}
                </div>
            ) : (
                <div className="empty-state">
                    <span aria-hidden="true">♡</span>
                    <h2>Your shortlist starts here</h2>
                    <p>Save providers to compare their ratings, services, and rates later.</p>
                    <Link to="/home" className="btn btn-primary">Browse providers</Link>
                </div>
            )}
        </main>
    );
}