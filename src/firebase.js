import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const exampleConfig = {
  apiKey: 'your_api_key_here',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef123456',
};

function isPlaceholderValue(value) {
  const normalized = value.trim();
  return /^(?:paste[_ -]|your[_ -]|placeholder\b)/i.test(normalized) || /_here$/i.test(normalized);
}

const hasFirebaseConfig = Object.entries(firebaseConfig).every(
  ([key, value]) => typeof value === 'string'
    && value.trim() !== ''
    && value !== exampleConfig[key]
    && !isPlaceholderValue(value)
) && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(firebaseConfig.projectId);

const firebaseEnvNames = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const invalidFirebaseValues = Object.entries(firebaseConfig)
  .filter(([key, value]) => typeof value !== 'string'
    || value.trim() === ''
    || value === exampleConfig[key]
    || isPlaceholderValue(value))
  .map(([key]) => firebaseEnvNames[key]);

if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(firebaseConfig.projectId)) {
  invalidFirebaseValues.push(firebaseEnvNames.projectId);
}

export const firebaseConfigIssue = invalidFirebaseValues.length
  ? `Replace missing or placeholder values in .env.local: ${[...new Set(invalidFirebaseValues)].join(', ')}.`
  : '';

let app = null;
if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, 'asia-south1') : null;
export const firebaseReady = hasFirebaseConfig;
export default app;
