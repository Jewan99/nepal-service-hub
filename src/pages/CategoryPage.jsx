import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCategory } from '../data/categories';
import { getWorkersByCategory } from '../data/mockWorkers';
import WorkerCard from '../components/WorkerCard';
import useWorkerDirectory from '../hooks/useWorkerDirectory';

export default function CategoryPage() {
  const { id } = useParams();
  const { workers, loading } = useWorkerDirectory();
  const category = getCategory(id);
  const categoryWorkers = getWorkersByCategory(id, workers);

  if (!category) {
    return (
      <div className="container section">
        <p>Category not found. <Link to="/">Go back home</Link>.</p>
      </div>
    );
  }

  return (
    <div className="container section">
      <div className="section-head">
        <h2>{category.icon} {category.name}</h2>
        <p>{categoryWorkers.length} available near you</p>
      </div>
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Finding listed workers…</p>}
      {categoryWorkers.length ? (
        <div className="worker-grid">
          {categoryWorkers.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      ) : (
        <p style={{ color: 'var(--ink-soft)' }}>No listings yet in this category.</p>
      )}
    </div>
  );
}
