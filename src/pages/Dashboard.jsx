import React, { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, linkWithPhoneNumber } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth, firebaseReady } from '../firebase';
import { validatePhone } from '../utils/validation';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const verifierRef = useRef(null);
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);

  useEffect(() => () => verifierRef.current?.clear(), []);

  async function sendPhoneCode(event) {
    event.preventDefault();
    setPhoneError('');
    setPhoneMessage('');
    const validationError = validatePhone(phone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    const compactPhone = phone.replace(/[\s-]/g, '');
    const normalizedPhone = compactPhone.startsWith('+') ? compactPhone : `+977${compactPhone}`;
    setPhoneBusy(true);
    try {
      verifierRef.current?.clear();
      verifierRef.current = new RecaptchaVerifier(auth, 'phone-recaptcha', { size: 'invisible' });
      const result = await linkWithPhoneNumber(user, normalizedPhone, verifierRef.current);
      setConfirmation(result);
      setPhoneMessage('A verification code was sent to your phone.');
    } catch (error) {
      setPhoneError(error.message || 'Could not send a verification code.');
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setPhoneBusy(false);
    }
  }

  async function verifyPhoneCode(event) {
    event.preventDefault();
    setPhoneError('');
    setPhoneMessage('');
    if (!/^\d{6}$/.test(verificationCode)) {
      setPhoneError('Enter the 6-digit verification code.');
      return;
    }

    setPhoneBusy(true);
    try {
      const credential = await confirmation.confirm(verificationCode);
      await credential.user.reload();
      setConfirmation(null);
      setVerificationCode('');
      setPhoneMessage('Your verified phone is linked to this account for SMS recovery.');
    } catch (error) {
      setPhoneError(error.message || 'The verification code is invalid or expired.');
    } finally {
      setPhoneBusy(false);
    }
  }

  return (
    <div className="container section">
      <h2>Welcome, {profile?.name || user?.email}</h2>
      <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
        Signed in as {user?.email} · Role: {profile?.role || 'customer'}
      </p>

      <div className="worker-card" style={{ maxWidth: 480, marginTop: 28 }}>
        <div className="body">
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>Account status</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {profile?.verified
              ? '✓ Your account is verified.'
              : 'Your account is not yet verified. Verification is handled by our team and cannot be self-assigned, for everyone\u2019s safety.'}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 24 }}>
        This is a starter dashboard — extend it with real booking history,
        worker listing management, and reviews as you build out the backend.
      </p>

      {firebaseReady && (
        <div className="worker-card" style={{ maxWidth: 560, marginTop: 24 }}>
          <div className="body">
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>SMS password recovery</h3>
            {user?.phoneNumber ? (
              <p style={{ color: 'var(--success)', fontSize: 14 }}>Verified phone linked: {user.phoneNumber}</p>
            ) : confirmation ? (
              <form onSubmit={verifyPhoneCode} noValidate>
                <div className="field">
                  <label htmlFor="phone-verification-code">6-digit verification code</label>
                  <input
                    id="phone-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                {phoneError && <div className="form-error-banner" role="alert">{phoneError}</div>}
                <button className="btn btn-primary" type="submit" disabled={phoneBusy}>
                  {phoneBusy ? 'Verifying…' : 'Verify phone'}
                </button>
              </form>
            ) : (
              <form onSubmit={sendPhoneCode} noValidate>
                <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 14 }}>
                  Verify and link a phone number before using SMS password recovery.
                </p>
                <div className="field">
                  <label htmlFor="account-phone">Nepal mobile number</label>
                  <input
                    id="account-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="98XXXXXXXX or +97798XXXXXXXX"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                {phoneError && <div className="form-error-banner" role="alert">{phoneError}</div>}
                <button className="btn btn-primary" type="submit" disabled={phoneBusy}>
                  {phoneBusy ? 'Sending code…' : 'Send verification code'}
                </button>
                <div id="phone-recaptcha" />
              </form>
            )}
            {phoneMessage && <p role="status" style={{ color: 'var(--success)', fontSize: 13, marginTop: 10 }}>{phoneMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
