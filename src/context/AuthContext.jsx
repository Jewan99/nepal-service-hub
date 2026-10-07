import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { checkLoginAllowed, recordFailedLogin, clearLoginAttempts } from '../utils/rateLimiter';
import {
  clearDemoSession,
  hashDemoPassword,
  readDemoSession,
  readDemoUsers,
  saveDemoSession,
  verifyDemoPassword,
  writeDemoUsers,
} from '../utils/demoAuth';
import { toGenericAuthMessage } from '../utils/validation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      const demoEmail = readDemoSession();
      const demoAccount = demoEmail ? readDemoUsers()[demoEmail] : null;
      if (demoAccount?.profile) {
        setUser({
          uid: demoAccount.uid || demoEmail,
          email: demoAccount.email || demoEmail,
          displayName: demoAccount.profile.name || '',
        });
        setProfile(demoAccount.profile);
      } else {
        clearDemoSession();
        setUser(null);
        setProfile(null);
      }
      setEmailVerified(false);
      setLoading(false);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setEmailVerified(Boolean(fbUser?.emailVerified));
      if (fbUser) {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signup({ name, email, password, role }) {
    if (!auth || !db) {
      const normalizedEmail = email.trim().toLowerCase();
      const users = readDemoUsers();
      if (users[normalizedEmail]) throw new Error('An account with this email already exists.');

      const demoUser = {
        uid: `demo-${crypto.randomUUID()}`,
        email: normalizedEmail,
        profile: { name, email: normalizedEmail, role, verified: false, createdAt: new Date().toISOString() },
        passwordHash: await hashDemoPassword(password),
      };
      users[normalizedEmail] = demoUser;
      writeDemoUsers(users);
      saveDemoSession(normalizedEmail);
      setUser({ uid: demoUser.uid, email: normalizedEmail, displayName: name });
      setProfile(demoUser.profile);
      return { uid: demoUser.uid, email: normalizedEmail };
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      role,
      verified: false,
      createdAt: serverTimestamp(),
    });
    setProfile({ name, email, role, verified: false });
    return cred.user;
  }

  async function ensureAuthProfile(firebaseUser) {
    const profileRef = doc(db, 'users', firebaseUser.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const existingProfile = profileSnap.data();
      setProfile(existingProfile);
      return { email: firebaseUser.email, role: existingProfile.role };
    }

    const name = (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Phone user').slice(0, 80);
    const newProfile = {
      name,
      email: firebaseUser.email || '',
      role: 'customer',
      verified: false,
      createdAt: serverTimestamp(),
    };
    await setDoc(profileRef, newProfile);
    setProfile(newProfile);
    return { email: firebaseUser.email, role: newProfile.role };
  }

  async function loginWithGoogle() {
    if (!auth || !db) throw new Error('Google sign-in requires valid Firebase configuration.');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    return ensureAuthProfile(credential.user);
  }

  async function loginWithApple() {
    if (!auth || !db) throw new Error('Apple sign-in requires valid Firebase configuration.');
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const credential = await signInWithPopup(auth, provider);
    return ensureAuthProfile(credential.user);
  }

  async function sendPhoneLoginCode(phone, appVerifier) {
    if (!auth || !db) throw new Error('Phone sign-in requires valid Firebase configuration.');
    const compactPhone = phone.replace(/[\s-]/g, '');
    const normalizedPhone = compactPhone.startsWith('+') ? compactPhone : `+977${compactPhone}`;
    return signInWithPhoneNumber(auth, normalizedPhone, appVerifier);
  }

  async function verifyPhoneLoginCode(confirmation, code) {
    const credential = await confirmation.confirm(code);
    return ensureAuthProfile(credential.user);
  }

  async function login({ email, password }) {
    if (!auth || !db) {
      const normalizedEmail = email.trim().toLowerCase();
      const account = readDemoUsers()[normalizedEmail];
      if (!account || !(await verifyDemoPassword(password, account))) {
        throw new Error('Invalid email or password.');
      }

      const demoProfile = account.profile || {};
      const demoUser = {
        uid: account.uid || normalizedEmail,
        email: account.email || normalizedEmail,
        displayName: demoProfile.name || '',
      };
      saveDemoSession(normalizedEmail);
      setUser(demoUser);
      setProfile(demoProfile);
      return { email: demoUser.email, role: demoProfile.role };
    }

    const gate = await checkLoginAllowed(email);
    if (!gate.allowed) {
      const mins = Math.ceil((gate.retryAfterSeconds || 60) / 60);
      const err = new Error(`Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
      err.rateLimited = true;
      throw err;
    }

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      await recordFailedLogin(email);
      const friendly = new Error(toGenericAuthMessage(err));
      friendly.code = err.code;
      throw friendly;
    }

    await clearLoginAttempts(email);
    try {
      const profileSnap = await getDoc(doc(db, 'users', cred.user.uid));
      return {
        email: cred.user.email,
        role: profileSnap.exists() ? profileSnap.data().role : null,
      };
    } catch {
      await signOut(auth);
      throw new Error('Signed in, but your account profile could not be loaded. Check Firestore access and try again.');
    }
  }

  async function logout() {
    if (!auth || !db) {
      clearDemoSession();
      setUser(null);
      setProfile(null);
      return;
    }

    await signOut(auth);
  }

  async function updateAccountName(name) {
    if (!auth || !db) {
      const email = user?.email?.toLowerCase();
      const users = readDemoUsers();
      if (!email || !users[email]) throw new Error('Your local demo account could not be found.');
      users[email].profile = { ...users[email].profile, name };
      writeDemoUsers(users);
      setUser((current) => ({ ...current, displayName: name }));
      setProfile((current) => ({ ...current, name }));
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in again before changing your profile.');
    await updateProfile(currentUser, { displayName: name });
    await updateDoc(doc(db, 'users', currentUser.uid), { name });
    setProfile((current) => ({ ...current, name }));
  }

  async function changePassword({ currentPassword, newPassword }) {
    if (!auth || !db) {
      const email = user?.email?.toLowerCase();
      const users = readDemoUsers();
      const account = email ? users[email] : null;
      if (!account) throw new Error('Your local demo account could not be found.');
      if (!(await verifyDemoPassword(currentPassword, account))) {
        const error = new Error('The current password is incorrect.');
        error.code = 'auth/wrong-password';
        throw error;
      }
      account.passwordHash = await hashDemoPassword(newPassword);
      delete account.password;
      writeDemoUsers(users);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.email) throw new Error('Sign in again before changing your password.');
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  async function sendVerificationEmail() {
    if (!auth?.currentUser) throw new Error('Email verification requires a Firebase account.');
    await sendEmailVerification(auth.currentUser);
  }

  async function refreshEmailVerification() {
    if (!auth?.currentUser) return false;
    await reload(auth.currentUser);
    const verified = Boolean(auth.currentUser.emailVerified);
    setEmailVerified(verified);
    return verified;
  }

  const value = {
    user,
    profile,
    loading,
    emailVerified,
    signup,
    login,
    loginWithGoogle,
    loginWithApple,
    sendPhoneLoginCode,
    verifyPhoneLoginCode,
    logout,
    updateAccountName,
    changePassword,
    sendVerificationEmail,
    refreshEmailVerification,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
