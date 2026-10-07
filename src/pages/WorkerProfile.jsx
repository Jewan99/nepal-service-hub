import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWorker } from '../data/mockWorkers';
import { useAuth } from '../context/AuthContext';
import useWorkerDirectory from '../hooks/useWorkerDirectory';

export default function WorkerProfile() {
  const { id } = useParams();
  const { workers, loading } = useWorkerDirectory();
  const worker = workers.find((entry) => entry.id === id) || getWorker(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booked, setBooked] = useState(false);

  if (!worker && loading) {
    return <div className="container section">Loading worker profile…</div>;
  }
  if (!worker) {
    return <div className="container section"><p>Worker not found. <Link to="/">Go back home</Link>.</p></div>;
  }

  function handleBook() {
    if (!user) {
      navigate('/login');
      return;
    }
    setBooked(true);
  }

  const initials = worker.name.split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <div className="worker-card">
        <div className="body">
          <div className="worker-top">
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>{initials}</div>
            <div>
              <div className="worker-name" style={{ fontSize: 20 }}>{worker.name}</div>
              <div className="worker-trade">{worker.city}</div>
            </div>
          </div>
          <div className="worker-card-badges">
            {worker.verified && <span className="badge">✓ Verified worker</span>}
            {worker.ownerUid ? <span className="badge chat-ready-badge">Direct chat available</span> : <span className="badge sample-badge">Sample profile</span>}
          </div>
          <p style={{ marginTop: 16, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{worker.bio}</p>
          <div className="worker-meta" style={{ marginTop: 20, fontSize: 15 }}>
            {worker.rating > 0
              ? <span className="stars">★ {worker.rating} <span style={{ color: 'var(--ink-soft)' }}>({worker.reviews || 0} reviews)</span></span>
              : <span className="new-provider">New provider · no reviews yet</span>}
            <span className="rate">Rs {worker.rate.toLocaleString()}/{worker.unit}</span>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            {booked ? (
              <span className="badge" style={{ padding: '10px 16px', fontSize: 14 }}>✓ Booking request sent</span>
            ) : (
              <button className="btn btn-primary" onClick={handleBook}>Request booking</button>
            )}
            {worker.ownerUid === user?.uid ? (
              <button className="btn btn-outline" type="button" onClick={() => navigate('/messages')}>Open inbox</button>
            ) : worker.ownerUid ? (
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => navigate(user ? `/messages/worker/${worker.ownerUid}` : '/login', user ? undefined : { state: { from: `/messages/worker/${worker.ownerUid}` } })}
              >
                Message worker
              </button>
            ) : (
              <button className="btn btn-outline" type="button" disabled>Sample profile can’t receive messages</button>
            )}
          </div>
          {!user && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 12 }}>You’ll need to log in to book or message a worker.</p>}
        </div>
      </div>
    </div>
  );
}
