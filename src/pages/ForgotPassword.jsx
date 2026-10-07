import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { firebaseReady } from '../firebase';
import { validateEmail, validatePassword, validatePhone } from '../utils/validation';
import { requestPasswordRecoveryCode, resetPasswordWithCode } from '../utils/passwordRecovery';

export default function ForgotPassword() {
    const location = useLocation();
    const returnTo = location.state?.returnTo === '/admin/login' ? '/admin/login' : '/login';
    const [recoveryMethod, setRecoveryMethod] = useState('email');
    const [recoveryEmail, setRecoveryEmail] = useState(location.state?.email || '');
    const [recoveryPhone, setRecoveryPhone] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [recoveryStep, setRecoveryStep] = useState('request');
    const [recoveryError, setRecoveryError] = useState('');
    const [recoveryMessage, setRecoveryMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [demoCode, setDemoCode] = useState('');

    async function handleRequestCode(event) {
        event.preventDefault();
        setRecoveryError('');
        setRecoveryMessage('');

        const emailError = validateEmail(recoveryEmail);
        const phoneError = recoveryMethod === 'phone' ? validatePhone(recoveryPhone) : '';
        if (emailError || phoneError) {
            setRecoveryError(emailError || phoneError);
            return;
        }

        setSubmitting(true);
        try {
            const phone = recoveryPhone.replace(/[^\d+]/g, '');
            const normalizedPhone = recoveryMethod === 'phone'
                ? (phone.startsWith('+') ? phone : `+977${phone}`)
                : undefined;
            const result = await requestPasswordRecoveryCode({
                email: recoveryEmail.trim(),
                method: recoveryMethod,
                phone: normalizedPhone,
            });
            setRecoveryStep('verify');
            if (firebaseReady) {
                setRecoveryMessage('If the account and recovery method are available, a 6-digit code has been sent.');
            } else {
                setDemoCode(result.data.demoCode);
                setRecoveryMessage('Enter the local demo code shown below. It was not sent by email.');
            }
        } catch (error) {
            setRecoveryError(error.message || 'Could not send a verification code.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResetPassword(event) {
        event.preventDefault();
        setRecoveryError('');
        setRecoveryMessage('');

        if (!/^\d{6}$/.test(recoveryCode)) {
            setRecoveryError('Enter the 6-digit verification code.');
            return;
        }
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setRecoveryError(passwordError);
            return;
        }

        setSubmitting(true);
        try {
            await resetPasswordWithCode({
                email: recoveryEmail.trim(),
                method: recoveryMethod,
                code: recoveryCode,
                newPassword,
            });
            setRecoveryStep('done');
            setRecoveryMessage('Password updated. Log in using your new password.');
        } catch (error) {
            setRecoveryError(error.message || 'The code is invalid or expired. Request a new code.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="auth-wrap">
            <div className="auth-card">
                <h1>Reset your password</h1>
                <p className="auth-sub">Verify your account to choose a new password.</p>

                {!firebaseReady && (
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
                        Local demo recovery only. The code is displayed here and is not sent to an email address.
                    </p>
                )}

                {recoveryStep === 'done' ? (
                    <Link className="btn btn-primary btn-block" to={returnTo}>Back to login</Link>
                ) : recoveryStep === 'request' ? (
                    <form onSubmit={handleRequestCode} noValidate>
                        <div className="field">
                            <label htmlFor="recovery-email">Account email</label>
                            <input
                                id="recovery-email"
                                type="email"
                                autoComplete="email"
                                value={recoveryEmail}
                                onChange={(event) => setRecoveryEmail(event.target.value)}
                            />
                        </div>
                        {firebaseReady && (
                            <div className="field">
                                <label>Send code by</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className={`btn ${recoveryMethod === 'email' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRecoveryMethod('email')}>Email</button>
                                    <button type="button" className={`btn ${recoveryMethod === 'phone' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRecoveryMethod('phone')}>Phone SMS</button>
                                </div>
                            </div>
                        )}
                        {firebaseReady && recoveryMethod === 'phone' && (
                            <div className="field">
                                <label htmlFor="recovery-phone">Verified account phone</label>
                                <input
                                    id="recovery-phone"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="98XXXXXXXX or +97798XXXXXXXX"
                                    value={recoveryPhone}
                                    onChange={(event) => setRecoveryPhone(event.target.value)}
                                />
                            </div>
                        )}
                        {recoveryError && <div className="form-error-banner" role="alert">{recoveryError}</div>}
                        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                            {submitting ? 'Sending code…' : 'Send 6-digit code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} noValidate>
                        <div className="field">
                            <label htmlFor="recovery-code">6-digit verification code</label>
                            <input
                                id="recovery-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={recoveryCode}
                                onChange={(event) => setRecoveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="new-password">New password</label>
                            <input
                                id="new-password"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                            />
                        </div>
                        {recoveryError && <div className="form-error-banner" role="alert">{recoveryError}</div>}
                        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                            {submitting ? 'Updating password…' : 'Verify code and reset password'}
                        </button>
                    </form>
                )}

                {recoveryMessage && <p role="status" style={{ color: 'var(--success)', fontSize: 13, marginTop: 10 }}>{recoveryMessage}</p>}
                {!firebaseReady && demoCode && recoveryStep === 'verify' && (
                    <div aria-label="Local demo verification code" style={{ display: 'grid', gap: 4, marginTop: 10, padding: 12, border: '1px solid var(--line)', borderRadius: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Demo code (not sent)</span>
                        <strong style={{ fontSize: 22 }}>{demoCode}</strong>
                    </div>
                )}

                {recoveryStep !== 'done' && (
                    <p className="auth-switch"><Link to={returnTo}>Back to login</Link></p>
                )}
            </div>
        </div>
    );
}