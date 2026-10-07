import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function WorkerRoute({ children }) {
    const { user, profile, loading } = useAuth();

    if (loading) return <div className="container" style={{ padding: 60 }}>Loading…</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (profile?.role !== 'worker') return <Navigate to="/home" replace />;

    return children;
}