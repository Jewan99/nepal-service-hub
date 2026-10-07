import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readSavedWorkers, toggleSavedWorker } from '../utils/savedWorkers';

export default function WorkerCard({ worker }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const initials = worker.name.split(' ').map((n) => n[0]).slice(0, 2).join('');

  useEffect(() => {
    const scope = user?.uid || 'guest';
    const syncSaved = (event) => {
      if (!event || event.detail?.scope === scope) {
        setSaved(readSavedWorkers(scope).includes(worker.id));
      }
    };
    syncSaved();
    window.addEventListener('saved-workers-changed', syncSaved);
    return () => window.removeEventListener('saved-workers-changed', syncSaved);
  }, [user?.uid, worker.id]);

  function handleSave() {
    const scope = user?.uid || 'guest';
    const savedIds = toggleSavedWorker(scope, worker.id);
    setSaved(savedIds.includes(worker.id));
  }

  return (
    <article className="worker-card worker-card-item">
      <Link to={`/worker/${worker.id}`} className="worker-card-main">
        <div className="body">
          <div className="worker-top">
            <div className="avatar">{initials}</div>
            <div>
              <div className="worker-name">{worker.name}</div>
              <div className="worker-trade">{worker.city}</div>
            </div>
          </div>
          <div className="worker-card-badges">
            {worker.verified && <span className="badge">✓ Verified</span>}
            {worker.ownerUid ? <span className="badge chat-ready-badge">Direct chat</span> : <span className="badge sample-badge">Sample listing</span>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.5 }}>
            {worker.bio}
          </p>
          <div className="worker-meta">
            {worker.rating > 0
              ? <span className="stars">★ {worker.rating} <span style={{ color: 'var(--ink-soft)' }}>({worker.reviews || 0})</span></span>
              : <span className="new-provider">New provider</span>}
            <span className="rate">Rs {worker.rate.toLocaleString()}/{worker.unit}</span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        className={`favorite-toggle${saved ? ' is-saved' : ''}`}
        onClick={handleSave}
        aria-label={saved ? `Remove ${worker.name} from saved providers` : `Save ${worker.name}`}
        aria-pressed={saved}
        title={saved ? 'Remove saved provider' : 'Save provider'}
      >
        {saved ? '♥' : '♡'}
      </button>
    </article>
  );
}
