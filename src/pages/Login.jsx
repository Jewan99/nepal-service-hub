import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RecaptchaVerifier } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth, firebaseConfigIssue, firebaseReady } from '../firebase';
import { validateEmail, validatePhone } from '../utils/validation';

export default function Login({ adminOnly = false }) {
  const { login, loginWithGoogle, loginWithApple, sendPhoneLoginCode, verifyPhoneLoginCode, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.from?.startsWith('/messages/') ? location.state.from : '';

  const [form, setForm] = useState({ email: '', password: '' });
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const [phoneMode, setPhoneMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const verifierRef = useRef(null);

  useEffect(() => () => verifierRef.current?.clear(), []);
  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
  }

  function validate() {
    const errs = {};
    const emailErr = validateEmail(form.email);
    if (emailErr) errs.email = emailErr;
    if (!form.password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function finishLogin(user) {
    if (adminOnly && user.role !== 'admin') {
      await logout();
      setFormError(firebaseReady
        ? 'This account is not configured as an administrator. Use the existing account and set its Firestore users/{uid} role to "admin"; you do not need to sign up again.'
        : 'This local demo account is not an administrator. Create an Admin — local demo only account to open the demo admin portal.');
      return;
    }
    navigate(user.role === 'admin' ? '/admin' : returnTo || '/home');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      await finishLogin(user);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProviderLogin(providerLogin) {
    setFormError('');
    setSubmitting(true);
    try {
      await finishLogin(await providerLogin());
    } catch (err) {
      setFormError(err.message || 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendPhoneCode(event) {
    event.preventDefault();
    setFormError('');
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }

    setSubmitting(true);
    try {
      if (!auth || !firebaseReady) throw new Error('Phone sign-in requires valid Firebase configuration.');
      verifierRef.current?.clear();
      verifierRef.current = new RecaptchaVerifier(auth, 'phone-login-recaptcha', { size: 'invisible' });
      const confirmation = await sendPhoneLoginCode(phone, verifierRef.current);
      setPhoneConfirmation(confirmation);
    } catch (err) {
      setFormError(err.message || 'Could not send a verification code.');
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyPhoneCode(event) {
    event.preventDefault();
    setFormError('');
    if (!/^\d{6}$/.test(verificationCode)) {
      setFormError('Enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      await finishLogin(await verifyPhoneLoginCode(phoneConfirmation, verificationCode));
    } catch (err) {
      setFormError(err.message || 'The verification code is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{adminOnly ? 'Admin sign in' : 'Welcome back'}</h1>
        <p className="auth-sub">{adminOnly ? 'Sign in with your existing administrator account.' : 'Log in to book and manage services.'}</p>
        {!firebaseReady && (
          <p className="auth-provider-notice">
            Local demo mode: sign-in works only for accounts saved in this browser. {firebaseConfigIssue} Configure Firebase for real accounts and provider sign-in.
          </p>
        )}

        {formError && <div className="form-error-banner">{formError}</div>}

        {!phoneMode ? <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={fieldErrors.email ? 'invalid' : ''}
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className={fieldErrors.password ? 'invalid' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <Link
              to="/forgot-password"
              state={{ email: form.email.trim(), returnTo: adminOnly ? '/admin/login' : '/login' }}
              className="btn btn-ghost"
            >
              Forgot password?
            </Link>
          </div>
        </form> : (
          <form onSubmit={phoneConfirmation ? handleVerifyPhoneCode : handleSendPhoneCode} noValidate>
            {!phoneConfirmation ? (
              <div className="field">
                <label htmlFor="login-phone">Nepali mobile number</label>
                <input
                  id="login-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="login-verification-code">6-digit verification code</label>
                  <input
                    id="login-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => {
                  setPhoneConfirmation(null);
                  setVerificationCode('');
                }}>
                  Change phone number
                </button>
              </>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Please wait…' : phoneConfirmation ? 'Verify and log in' : 'Send verification code'}
            </button>
          </form>
        )}

        {!adminOnly && (
          <>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="auth-provider-actions">
              <button type="button" className="btn btn-outline btn-block" disabled={submitting || !firebaseReady} onClick={() => handleProviderLogin(loginWithGoogle)}>
                Continue with Google
              </button>
              <button type="button" className="btn btn-outline btn-block" disabled={submitting || !firebaseReady} onClick={() => handleProviderLogin(loginWithApple)}>
                Continue with Apple
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                disabled={submitting || !firebaseReady}
                onClick={() => {
                  setPhoneMode((value) => !value);
                  setPhoneConfirmation(null);
                  setVerificationCode('');
                  setFormError('');
                }}
              >
                {phoneMode ? 'Use email and password' : 'Continue with phone number'}
              </button>
            </div>
            <div id="phone-login-recaptcha" />
          </>
        )}

        <p className="auth-switch">
          {adminOnly ? (
            <>Customer or worker? <Link to="/login">Use regular login</Link></>
          ) : (
            <>New here? <Link to="/signup">Create an account</Link><br />Administrator? <Link to="/admin/login">Admin sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
