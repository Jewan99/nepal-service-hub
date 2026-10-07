export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NP_PHONE_RE = /^(?:\+977[- ]?)?9\d{9}$/;

export function validateEmail(email) {
  if (!email) return 'Email is required.';
  if (email.length > 254) return 'Email is too long.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return '';
}

export function validateName(name) {
  if (!name || !name.trim()) return 'Full name is required.';
  if (name.trim().length < 2) return 'Name is too short.';
  if (name.trim().length > 80) return 'Name is too long.';
  if (!/^[a-zA-Z\u0900-\u097F .'-]+$/.test(name.trim())) {
    return 'Name contains invalid characters.';
  }
  return '';
}

export function validatePhone(phone) {
  if (!phone) return 'Phone number is required.';
  if (!NP_PHONE_RE.test(phone.replace(/\s/g, ''))) {
    return 'Enter a valid Nepali mobile number (e.g. 98XXXXXXXX).';
  }
  return '';
}

const GENERIC_AUTH_ERROR = 'Invalid email or password.';

export function toGenericAuthMessage(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return GENERIC_AUTH_ERROR;
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Please choose a stronger password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
