import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateName, toGenericAuthMessage } from '../utils/validation';
import { firebaseReady } from '../firebase';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
  }

  function validate() {
    const errs = {};
    const nameErr = validateName(form.name);
    const emailErr = validateEmail(form.email);
    const passErr = validatePassword(form.password);
    if (nameErr) errs.name = nameErr;
    if (emailErr) errs.email = emailErr;
    if (passErr) errs.password = passErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      navigate(form.role === 'admin' ? '/admin' : form.role === 'worker' ? '/worker-setup' : '/home');
    } catch (err) {
      setFormError(toGenericAuthMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-sub">Join Nepal ServiceHub as a customer or a worker.</p>
        {!firebaseReady && (
          <p className="auth-provider-notice">
            Local demo mode: accounts stay in this browser and are not real or shared. Add valid Firebase web app values to .env.local for real accounts.
          </p>
        )}

        {formError && <div className="form-error-banner">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={fieldErrors.name ? 'invalid' : ''}
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

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
                autoComplete="new-password"
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
            {fieldErrors.password
              ? <span className="field-error">{fieldErrors.password}</span>
              : <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>At least 8 characters, with a letter and a number.</span>}
          </div>

          <div className="field">
            <label htmlFor="role">I am a</label>
            <select id="role" value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="customer">Customer — looking to hire</option>
              <option value="worker">Worker — offering services</option>
              {!firebaseReady && <option value="admin">Admin — local demo only</option>}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link><br />
          Administrator? <Link to="/admin/login">Admin sign in</Link>
        </p>
      </div>
    </div>
  );
}
