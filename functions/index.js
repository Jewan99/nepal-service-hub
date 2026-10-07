const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, region: 'asia-south1' });

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const RESET_CODE_SECRET = defineSecret('RESET_CODE_SECRET');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESET_EMAIL_FROM = defineSecret('RESET_EMAIL_FROM');
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = defineSecret('TWILIO_FROM_NUMBER');

function keyFor(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function recoveryCodeHash(uid, method, code) {
  return crypto.createHmac('sha256', RESET_CODE_SECRET.value()).update(`${uid}:${method}:${code}`).digest('hex');
}

async function deliverRecoveryCode(method, destination, code) {
  if (method === 'email') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESET_EMAIL_FROM.value(),
        to: [destination],
        subject: 'Your Nepal ServiceHub password reset code',
        text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this message.`,
      }),
    });
    if (!response.ok) throw new Error('Email delivery failed.');
    return;
  }

  const accountSid = TWILIO_ACCOUNT_SID.value();
  const credentials = Buffer.from(`${accountSid}:${TWILIO_AUTH_TOKEN.value()}`).toString('base64');
  const body = new URLSearchParams({
    To: destination,
    From: TWILIO_FROM_NUMBER.value(),
    Body: `Nepal ServiceHub password reset code: ${code}. Expires in 10 minutes.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) throw new Error('SMS delivery failed.');
}

function normalizeRecoveryPhone(phone) {
  const value = String(phone || '').replace(/[\s-]/g, '');
  if (/^9\d{9}$/.test(value)) return `+977${value}`;
  if (/^\+9779\d{9}$/.test(value)) return value;
  return null;
}

const recoverySecrets = [
  RESET_CODE_SECRET,
  RESEND_API_KEY,
  RESET_EMAIL_FROM,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER,
];

exports.beginPasswordRecovery = onCall({ secrets: recoverySecrets }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const method = request.data?.method;
  if (!isValidEmail(email) || !['email', 'phone'].includes(method)) {
    throw new HttpsError('invalid-argument', 'A valid email and recovery method are required.');
  }

  let account;
  try {
    account = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') return { ok: true };
    throw error;
  }

  let destination = account.email;
  if (method === 'phone') {
    const requestedPhone = normalizeRecoveryPhone(request.data?.phone);
    if (!requestedPhone || !account.phoneNumber || account.phoneNumber !== requestedPhone) {
      return { ok: true };
    }
    destination = account.phoneNumber;
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const now = Date.now();
  const resetRef = db.collection('passwordResetCodes').doc(account.uid);
  await db.runTransaction(async (transaction) => {
    const previous = await transaction.get(resetRef);
    const data = previous.exists ? previous.data() : null;
    if (data?.sentAt && now - data.sentAt < 60 * 1000) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting another code.');
    }

    const withinWindow = data?.windowStart && now - data.windowStart < WINDOW_MS;
    const sends = withinWindow ? (data.sends || 0) + 1 : 1;
    if (sends > 3) {
      throw new HttpsError('resource-exhausted', 'Too many codes requested. Try again later.');
    }

    transaction.set(resetRef, {
      codeHash: recoveryCodeHash(account.uid, method, code),
      method,
      destination,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      sends,
      windowStart: withinWindow ? data.windowStart : now,
      sentAt: now,
    });
  });

  try {
    await deliverRecoveryCode(method, destination, code);
  } catch (error) {
    await resetRef.delete();
    console.error('Password recovery code delivery failed.');
    throw new HttpsError('unavailable', 'Could not send a verification code.');
  }

  return { ok: true };
});

exports.finishPasswordRecovery = onCall({ secrets: recoverySecrets }, async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();
  const method = request.data?.method;
  const code = String(request.data?.code || '');
  const newPassword = String(request.data?.newPassword || '');
  if (!isValidEmail(email) || !['email', 'phone'].includes(method)
    || !/^\d{6}$/.test(code) || newPassword.length < 8 || newPassword.length > 128
    || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new HttpsError('invalid-argument', 'Enter a valid code and a password with at least 8 characters, a letter, and a number.');
  }

  let account;
  try {
    account = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('invalid-argument', 'The code is invalid or expired.');
    }
    throw error;
  }

  const resetRef = db.collection('passwordResetCodes').doc(account.uid);
  const accepted = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(resetRef);
    if (!snapshot.exists) return false;

    const reset = snapshot.data();
    const now = Date.now();
    if (reset.method !== method || reset.expiresAt <= now || reset.used) {
      transaction.delete(resetRef);
      return false;
    }
    if (method === 'phone' && (!account.phoneNumber || account.phoneNumber !== reset.destination)) {
      transaction.delete(resetRef);
      return false;
    }

    const expected = Buffer.from(reset.codeHash, 'hex');
    const provided = Buffer.from(recoveryCodeHash(account.uid, method, code), 'hex');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      const attempts = (reset.attempts || 0) + 1;
      if (attempts >= 5) transaction.delete(resetRef);
      else transaction.update(resetRef, { attempts });
      return false;
    }

    transaction.update(resetRef, { used: true });
    return true;
  });

  if (!accepted) throw new HttpsError('invalid-argument', 'The code is invalid or expired.');

  try {
    await admin.auth().updateUser(account.uid, { password: newPassword });
    await admin.auth().revokeRefreshTokens(account.uid);
  } finally {
    await resetRef.delete();
  }

  return { ok: true };
});

exports.checkLoginAllowed = onCall(async (request) => {
  const { email } = request.data || {};
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }

  const ref = db.collection('loginAttempts').doc(keyFor(email));
  const snap = await ref.get();
  if (!snap.exists) return { allowed: true };

  const data = snap.data();
  const now = Date.now();

  if (data.lockedUntil && data.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((data.lockedUntil - now) / 1000),
    };
  }

  return { allowed: true };
});

exports.recordFailedLogin = onCall(async (request) => {
  const { email } = request.data || {};
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }

  const ref = db.collection('loginAttempts').doc(keyFor(email));
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;

    const withinWindow = data && data.windowStart && now - data.windowStart < WINDOW_MS;
    const count = withinWindow ? (data.count || 0) + 1 : 1;
    const windowStart = withinWindow ? data.windowStart : now;

    const payload = {
      count,
      windowStart,
      updatedAt: now,
    };

    if (count >= MAX_ATTEMPTS) {
      payload.lockedUntil = now + LOCKOUT_MS;
    }

    tx.set(ref, payload, { merge: true });
  });

  return { ok: true };
});

exports.clearLoginAttempts = onCall(async (request) => {
  const { email } = request.data || {};
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }
  await db.collection('loginAttempts').doc(keyFor(email)).delete();
  return { ok: true };
});

exports.deleteAccountAsAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to continue.');
  }

  const adminProfile = await db.collection('users').doc(request.auth.uid).get();
  if (!adminProfile.exists || adminProfile.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }

  const targetUid = String(request.data?.uid || '');
  if (!targetUid || targetUid === request.auth.uid) {
    throw new HttpsError('invalid-argument', 'Choose a customer or worker account.');
  }

  const targetRef = db.collection('users').doc(targetUid);
  const targetProfile = await targetRef.get();
  if (!targetProfile.exists || !['customer', 'worker'].includes(targetProfile.data().role)) {
    throw new HttpsError('failed-precondition', 'Only customer and worker accounts can be removed.');
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  const relatedBookings = await Promise.all([
    db.collection('bookings').where('customerId', '==', targetUid).get(),
    db.collection('bookings').where('workerId', '==', targetUid).get(),
  ]);
  const bookingRefs = new Map();
  for (const snapshot of relatedBookings) {
    for (const booking of snapshot.docs) bookingRefs.set(booking.ref.path, booking.ref);
  }

  const refs = [targetRef, db.collection('workers').doc(targetUid), ...bookingRefs.values()];
  for (let offset = 0; offset < refs.length; offset += 500) {
    const batch = db.batch();
    refs.slice(offset, offset + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return { ok: true, uid: targetUid };
});
