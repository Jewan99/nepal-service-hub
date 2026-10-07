import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, profile } = useAuth();

  return (
    <header className="navbar">
      <div className="container">
        <Link to="/home" className="brand">
          <span className="brand-mark">NS</span>
          Nepal ServiceHub
        </Link>
        <nav className="nav-links">
          <Link to="/home">Browse</Link>
          {user ? (
            <>
              {profile?.role === 'admin' ? (
                <Link to="/admin">Admin</Link>
              ) : profile?.role === 'worker' ? (
                <Link to="/worker-setup">My listing</Link>
              ) : (
                <Link to="/dashboard">{profile?.name?.split(' ')[0] || 'Dashboard'}</Link>
              )}
              {profile?.role !== 'admin' && <Link to="/messages">Messages</Link>}
              <Link to="/saved">Saved</Link>
              <Link to="/verification">Verification</Link>
              <Link to="/settings" className="nav-settings">Settings</Link>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
