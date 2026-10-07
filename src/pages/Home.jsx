import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categories } from '../data/categories';
import { searchWorkers } from '../data/mockWorkers';
import WorkerCard from '../components/WorkerCard';
import ParticleBackground from '../components/ParticleBackground';
import useWorkerDirectory from '../hooks/useWorkerDirectory';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { workers } = useWorkerDirectory();
  const resultsRef = useRef(null);
  const results = query.trim() ? searchWorkers(query, workers) : [];

  function handleSubmit(e) {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      <section className="hero">
        <ParticleBackground />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> LOCAL SKILLS. RIGHT AROUND THE CORNER.
            </div>
            <h1>Find & hire trusted local workers, near you.</h1>
            <p>
              From a leaking tap to a fresh coat of paint, meet skilled people
              in your neighborhood and choose with confidence.
            </p>
            <form className="search-bar" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Search “electrician in Baneshwor”…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
            <div className="hero-trio">
              <b>FIND</b><span className="sep">/</span><b>BOOK</b><span className="sep">/</span><b>RELAX</b>
            </div>
          </div>

          <div className="hero-visual">
            <img
              className="hero-photo"
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=85"
              alt="Local electrician carefully working on a home installation"
            />
            <div className="hero-photo-note">
              <span className="photo-note-mark">✓</span>
              <span><strong>Good work, close to home</strong><small>Compare local professionals in one place</small></span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {query.trim() && (
          <section className="section search-results" ref={resultsRef} style={{ paddingBottom: 0 }}>
            <div className="section-head">
              <h2>Results for “{query}”</h2>
              <p>{results.length} found</p>
            </div>
            {results.length ? (
              <div className="worker-grid">
                {results.map((w) => <WorkerCard key={w.id} worker={w} />)}
              </div>
            ) : (
              <p style={{ color: 'var(--ink-soft)' }}>No matches yet — try a category below.</p>
            )}
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2>Browse by service</h2>
            <p>{categories.length} categories</p>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link to={`/workers/${c.id}`} key={c.id} className="cat-card">
                <img className="cat-avatar" src={c.portrait} alt={`${c.name} at work`} loading="lazy" />
                <h3>{c.name}</h3>
                <span>{c.blurb}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="how-section">
          <div className="how-intro">
            <span className="section-kicker">A BETTER WAY TO GET IT DONE</span>
            <h2>Good help should be easy to find.</h2>
          </div>
          <div className="how-steps">
            <article><span>01</span><h3>Search nearby</h3><p>Find people by service, name, or neighborhood.</p></article>
            <article><span>02</span><h3>Compare the details</h3><p>Review skills, ratings, and clear starting rates.</p></article>
            <article><span>03</span><h3>Choose your pro</h3><p>Open a profile and send a booking request.</p></article>
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Nepal ServiceHub. Built for local trust, one job at a time.
        </div>
      </footer>
    </div>
  );
}
