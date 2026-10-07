import { httpsCallable } from 'firebase/functions';
import { firebaseReady, functions } from '../firebase';
import { hashDemoPassword, readDemoUsers, writeDemoUsers } from './demoAuth';

const beginPasswordRecovery = functions ? httpsCallable(functions, 'beginPasswordRecovery') : null;
const finishPasswordRecovery = functions ? httpsCallable(functions, 'finishPasswordRecovery') : null;
let demoChallenge = null;

function createDemoCode() {
    const randomValue = new Uint32Array(1);
    crypto.getRandomValues(randomValue);
    return String(100000 + (randomValue[0] % 900000));
}

export async function requestPasswordRecoveryCode(payload) {
    if (firebaseReady) {
        if (!beginPasswordRecovery) throw new Error('Password recovery service is unavailable.');
        return beginPasswordRecovery(payload);
    }

    if (payload.method !== 'email') {
        throw new Error('Phone recovery requires Firebase and a verified phone number.');
    }

    const email = String(payload.email || '').trim().toLowerCase();
    const users = readDemoUsers();
    if (!users[email]) throw new Error('No local demo account was found with that email.');

    const code = createDemoCode();
    demoChallenge = { email, code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };
    return { data: { demoCode: code } };
}

export async function resetPasswordWithCode(payload) {
    if (firebaseReady) {
        if (!finishPasswordRecovery) throw new Error('Password recovery service is unavailable.');
        return finishPasswordRecovery(payload);
    }

    const email = String(payload.email || '').trim().toLowerCase();
    if (!demoChallenge || demoChallenge.email !== email || demoChallenge.expiresAt <= Date.now()) {
        demoChallenge = null;
        throw new Error('The demo code is invalid or expired. Request a new code.');
    }

    if (payload.code !== demoChallenge.code) {
        demoChallenge.attempts += 1;
        if (demoChallenge.attempts >= 5) demoChallenge = null;
        throw new Error('The demo code is invalid or expired.');
    }

    const users = readDemoUsers();
    if (!users[email]) {
        demoChallenge = null;
        throw new Error('No local demo account was found with that email.');
    }

    users[email].passwordHash = await hashDemoPassword(payload.newPassword);
    delete users[email].password;
    writeDemoUsers(users);
    demoChallenge = null;
}