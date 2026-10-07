import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { categories } from '../data/categories';
import { mockWorkers } from '../data/mockWorkers';
import { useAuth } from '../context/AuthContext';
import { db, firebaseReady, functions } from '../firebase';

function getDemoUsers() {
    try {
        return JSON.parse(localStorage.getItem('nepal-servicehub-demo-users') || '{}');
    } catch {
        return {};
    }
}

export default function AdminDashboard() {
    const { user, profile } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [removingUid, setRemovingUid] = useState('');

    useEffect(() => {
        if (profile?.role !== 'admin') return;

        if (!firebaseReady) {
            const demoUsers = getDemoUsers();
            setAccounts(Object.entries(demoUsers).map(([email, entry]) => ({
                uid: email,
                email: entry.email,
                ...entry.profile,
            })));
            return;
        }

        getDocs(collection(db, 'users'))
            .then((snapshot) => setAccounts(snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }))))
            .catch(() => setLoadError('Could not load user accounts.'));
    }, [profile?.role]);

    async function removeAccount(account) {
        if (!window.confirm(`Remove ${account.name || account.email}'s account? This also removes their worker listing and bookings.`)) return;

        setRemovingUid(account.uid);
        setLoadError('');
        try {
            if (firebaseReady) {
                await httpsCallable(functions, 'deleteAccountAsAdmin')({ uid: account.uid });
            } else {
                const demoUsers = getDemoUsers();
                delete demoUsers[account.uid];
                localStorage.setItem('nepal-servicehub-demo-users', JSON.stringify(demoUsers));
            }
            setAccounts((current) => current.filter((entry) => entry.uid !== account.uid));
        } catch (error) {
            setLoadError(error.message || 'Could not remove this account.');
        } finally {
            setRemovingUid('');
        }
    }

    const stats = [
        { label: 'Total users', value: accounts.length },
        { label: 'Workers listed', value: mockWorkers.length },
        { label: 'Categories', value: categories.length },
        { label: 'Verified workers', value: mockWorkers.filter((worker) => worker.verified).length },
    ];

    return (
        <div className="container section">
            <div className="section-head">
                <div>
                    <h2>Admin portal</h2>
                    <p>System overview</p>
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: 28 }}>
                {stats.map((stat) => (
                    <div key={stat.label} className="worker-card">
                        <div className="body">
                            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{stat.label}</div>
                            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.2fr 1fr' }}>
                <div className="worker-card">
                    <div className="body">
                        <h3 style={{ marginBottom: 14 }}>Registered users</h3>
                        {loadError && <p className="form-error-banner" role="alert">{loadError}</p>}
                        {accounts.length ? (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {accounts.map((entry) => (
                                    <div key={entry.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{entry.name || entry.email}</div>
                                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{entry.email}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="badge">{entry.role || 'customer'}</span>
                                            {['customer', 'worker'].includes(entry.role) && (
                                                <button
                                                    className="btn btn-outline"
                                                    type="button"
                                                    onClick={() => removeAccount(entry)}
                                                    disabled={removingUid === entry.uid}
                                                    aria-label={`Remove ${entry.name || entry.email}`}
                                                >
                                                    {removingUid === entry.uid ? 'Removing…' : 'Remove'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--ink-soft)' }}>{loadError ? '' : 'No users registered yet.'}</p>
                        )}
                    </div>
                </div>

                <div className="worker-card">
                    <div className="body">
                        <h3 style={{ marginBottom: 14 }}>Worker categories</h3>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {categories.map((category) => {
                                const workers = mockWorkers.filter((worker) => worker.category === category.id);
                                return (
                                    <div key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{category.icon} {category.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{workers.length} workers</div>
                                        </div>
                                        <span className="badge">{workers.filter((worker) => worker.verified).length} verified</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
