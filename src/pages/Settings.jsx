import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateName, validatePassword } from '../utils/validation';

export default function Settings() {
    const { user, profile, updateAccountName, changePassword, logout } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(profile?.name || user?.displayName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nameMessage, setNameMessage] = useState('');
    const [nameError, setNameError] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [busy, setBusy] = useState(false);

    async function saveName(event) {
        event.preventDefault();
        setNameError('');
        setNameMessage('');
        const validationError = validateName(name);
        if (validationError) {
            setNameError(validationError);
            return;
        }

        setBusy(true);
        try {
            await updateAccountName(name.trim());
            setNameMessage('Your name has been updated.');
        } catch (error) {
            setNameError(error.message || 'Could not update your name.');
        } finally {
            setBusy(false);
        }
    }

    async function savePassword(event) {
        event.preventDefault();
        setPasswordError('');
        setPasswordMessage('');
        const validationError = validatePassword(newPassword);
        if (validationError) {
            setPasswordError(validationError);
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('The new passwords do not match.');
            return;
        }

        setBusy(true);
        try {
            await changePassword({ currentPassword, newPassword });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMessage('Your password has been changed.');
        } catch (error) {
            setPasswordError(error.code === 'auth/requires-recent-login'
                ? 'Please sign out and sign back in before changing your password.'
                : error.message || 'Could not change your password.');
        } finally {
            setBusy(false);
        }
    }

    async function handleLogout() {
        await logout();
        navigate('/login', { replace: true });
    }

    return (
        <main className="container account-page">
            <div className="account-heading">
                <p className="eyebrow-light">YOUR ACCOUNT</p>
                <h1>Settings</h1>
                <p>Manage your profile and keep your account secure.</p>
            </div>

            <div className="settings-layout">
                <aside className="settings-aside">
                    <span className="settings-avatar">{(profile?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span>
                    <strong>{profile?.name || user?.displayName || 'ServiceHub member'}</strong>
                    <span>{user?.email}</span>
                    <span className="role-tag">{profile?.role || 'customer'}</span>
                </aside>

                <div className="settings-content">
                    <section className="settings-section">
                        <div className="settings-section-title">
                            <div><span className="section-kicker">PROFILE</span><h2>Personal details</h2></div>
                        </div>
                        <form onSubmit={saveName} noValidate>
                            <div className="field">
                                <label htmlFor="settings-name">Full name</label>
                                <input id="settings-name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="settings-email">Email address</label>
                                <input id="settings-email" type="email" value={user?.email || ''} disabled />
                            </div>
                            {nameError && <div className="form-error-banner" role="alert">{nameError}</div>}
                            {nameMessage && <p className="success-message" role="status">{nameMessage}</p>}
                            <button type="submit" className="btn btn-primary" disabled={busy}>Save name</button>
                        </form>
                    </section>

                    <section className="settings-section">
                        <div className="settings-section-title">
                            <div><span className="section-kicker">SECURITY</span><h2>Change password</h2></div>
                        </div>
                        <form onSubmit={savePassword} noValidate>
                            <div className="field">
                                <label htmlFor="current-password">Current password</label>
                                <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="new-password">New password</label>
                                <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="confirm-password">Confirm new password</label>
                                <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                            </div>
                            {passwordError && <div className="form-error-banner" role="alert">{passwordError}</div>}
                            {passwordMessage && <p className="success-message" role="status">{passwordMessage}</p>}
                            <button type="submit" className="btn btn-primary" disabled={busy}>Update password</button>
                        </form>
                    </section>

                    <section className="settings-logout">
                        <div><h2>Sign out</h2><p>End your current session on this device.</p></div>
                        <button type="button" className="btn btn-danger-outline" onClick={handleLogout}>Log out</button>
                    </section>
                </div>
            </div>
        </main>
    );
}