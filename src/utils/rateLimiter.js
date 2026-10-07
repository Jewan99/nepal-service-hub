import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const checkLoginAllowedFn = functions ? httpsCallable(functions, 'checkLoginAllowed') : null;
const recordFailedLoginFn = functions ? httpsCallable(functions, 'recordFailedLogin') : null;
const clearLoginAttemptsFn = functions ? httpsCallable(functions, 'clearLoginAttempts') : null;

export async function checkLoginAllowed(email) {
  if (!functions || !checkLoginAllowedFn) {
    return { allowed: true };
  }

  try {
    const res = await checkLoginAllowedFn({ email });
    return res.data;
  } catch (err) {
    console.error('checkLoginAllowed failed', err);
    return { allowed: true };
  }
}

export async function recordFailedLogin(email) {
  if (!functions || !recordFailedLoginFn) return;

  try {
    await recordFailedLoginFn({ email });
  } catch (err) {
    console.error('recordFailedLogin failed', err);
  }
}

export async function clearLoginAttempts(email) {
  if (!functions || !clearLoginAttemptsFn) return;

  try {
    await clearLoginAttemptsFn({ email });
  } catch (err) {
    console.error('clearLoginAttempts failed', err);
  }
}
