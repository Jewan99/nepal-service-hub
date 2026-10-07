import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { firebaseReady } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Verification() {
    const { user, profile, emailVerified, sendVerificationEmail, refreshEmailVerification } = useAuth();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function sendLink() {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await sendVerificationEmail();
            setMessage(`A verification link was sent to ${user.email}.`);
        } catch (sendError) {
            setError(sendError.message || 'Could not send the verification email.');
        } finally {
            setBusy(false);
        }
    }

    async function checkStatus() {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const verified = await refreshEmailVerification();
            setMessage(verified ? 'Your email address is verified.' : 'Your email is not verified yet. Open the link we emailed you, then check again.');
        } catch (refreshError) {
            setError(refreshError.message || 'Could not check verification status.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="container account-page">
            <div className="account-heading">
                <p className="eyebrow-light">ACCOUNT TRUST</p>
                <h1>Verify your account</h1>
                <p>Confirm your email so you can keep your ServiceHub account secure.</p>
            </div>

            <section className="verification-panel">
                <div className={`verification-mark ${emailVerified ? 'is-verified' : ''}`} aria-hidden="true">{emailVerified ? '✓' : '✉'}</div>
                <div className="verification-copy">
                    <span className="section-kicker">EMAIL ADDRESS</span>
                    <h2>{emailVerified ? 'Email verified' : 'Verify your email'}</h2>
                    <p>{user?.email}</p>
                    {emailVerified ? (
                        <p className="success-message">Your email is confirmed and linked to this account.</p>
                    ) : (
                        <p className="verification-note">We’ll send a secure link to your inbox. Open it, return here, and check your status.</p>
                    )}
                    {!firebaseReady && <p className="verification-note">Email verification requires Firebase configuration. Local demo accounts cannot receive email links.</p>}
                    {error && <div className="form-error-banner" role="alert">{error}</div>}
                    {message && <p className="success-message" role="status">{message}</p>}
                    <div className="verification-actions">
                        {!emailVerified && <button type="button" className="btn btn-primary" onClick={sendLink} disabled={busy || !firebaseReady}>{busy ? 'Please wait…' : 'Send verification link'}</button>}
                        {firebaseReady && <button type="button" className="btn btn-outline" onClick={checkStatus} disabled={busy}>{busy ? 'Checking…' : 'I verified my email'}</button>}
                    </div>
                </div>
            </section>

            <section className="verification-footnote">
                <strong>Worker identity checks are separate.</strong>
                <span>{profile?.verified ? 'Your worker profile has been reviewed.' : 'Email verification confirms your address; worker credentials are reviewed separately by our team.'}</span>
                <Link to="/settings">Account settings</Link>
            </section>
        </main>
    );
}