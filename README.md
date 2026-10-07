# 🇳🇵 Nepal ServiceHub

Find & hire trusted local workers — electricians, plumbers, AC/fridge repair,
mechanics, painters, cleaners, tutors, computer/mobile technicians,
photographers, beauticians, and construction workers.

A React + Firebase starter: browsable service categories, worker profiles,
a booking flow, and a full authentication system with the security controls
listed below.

## Stack

- **React 18 + Vite** — frontend
- **React Router** — routing
- **Firebase Authentication** — sign up / log in (email + password)
- **Cloud Firestore** — user profiles, worker listings, bookings
- **Cloud Functions (2nd gen)** — server-side login rate limiting

## Getting started

```bash
npm install
# Fill in the Firebase web app values in .env.local
npm run dev
```

### 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started → Sign-in method:** enable **Email/Password**, **Google**, **Apple**, and **Phone**. Add your development and production hostnames under **Settings → Authorized domains**. Apple sign-in also requires an Apple Developer Services ID, key, and team configuration in the provider settings. For phone testing, configure Firebase test phone numbers or enable SMS delivery and observe Firebase quotas.
3. **Build → Firestore Database → Create database** (start in production mode — the
   included `firestore.rules` handles access control).
4. **Project settings → General → Your apps → Add app → Web**, copy the config
   values into `.env.local`.

### 2. Deploy security rules and functions

```bash
npm install -g firebase-tools
firebase login
firebase init          # select your project; reuse the existing firestore.rules,
                        # firestore.indexes.json, firebase.json, functions/ folder
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
```

### 3. Run it

```bash
npm run dev
```

### Admin login

Without Firebase configuration, signup includes an **Admin — local demo only**
role. Demo accounts are stored in the current browser and are not suitable for
production.

With Firebase configured, create the admin user in **Authentication → Users**.
Then, in Firestore, create `users/{uid}` using that user's Firebase UID and set
`name`, `email`, `role: "admin"`, and `verified: false`. Admin roles cannot be
assigned through public signup; use the Firebase Console or a trusted Admin SDK
process. Log in with the email and password created in Firebase Authentication.

The admin portal can remove customer and worker accounts. Removal is checked by
a callable Cloud Function and deletes the Firebase Auth account, user profile,
worker listing, and bookings associated with that user. Admin accounts cannot
be removed from the portal.

### Direct messaging

With Firebase configured, customers can message workers whose profiles are
published from a worker account. Worker signup opens the profile setup page;
publishing creates `workers/{uid}`, linking that listing to the worker's
Firebase Authentication UID. Customers can start a conversation from that
profile, and workers can reply from **Messages**. Conversation and message reads
are limited by `firestore.rules` to the two participants. Deploy the included
rules with `firebase deploy --only firestore:rules` before enabling messaging.

Without Firebase configuration, messaging is a local demo stored in the current
browser only. Those conversations are not delivered to other devices or users.

### Password recovery setup

Recovery codes are delivered by Resend (email) and Twilio (SMS). Configure these
Firebase Functions secrets before deploying the recovery functions:

```bash
firebase functions:secrets:set RESET_CODE_SECRET
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set RESET_EMAIL_FROM
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_FROM_NUMBER
firebase deploy --only functions
```

Use a verified sender address for `RESET_EMAIL_FROM`. SMS recovery only sends
to the phone number already linked and verified on the user's Firebase Auth
account; the number entered on the recovery form must match it. Enable the
Firebase Phone provider. Signed-in users can link and verify their number from
the dashboard before using SMS recovery. Codes expire after 10 minutes, allow
five verification attempts, and are rate-limited to three sends per 15 minutes.

The rate-limiting Cloud Functions must be deployed for `login()` to work
end-to-end (locally you can point them at the [Firebase emulator suite](https://firebase.google.com/docs/emulator-suite)
instead of deploying).

## Security features, and where they live

| Requirement | Implementation |
|---|---|
| **Server-side validation** | `firestore.rules` re-validates every field (name length, email format, category, rate bounds, role, etc.) on the server for every write — the client-side checks in `src/utils/validation.js` are UX only and can't be relied on for security. Cloud Functions also re-validate their inputs (`functions/index.js`). |
| **Login rate limiting** | `functions/index.js` implements `checkLoginAllowed` / `recordFailedLogin` / `clearLoginAttempts` as callable Cloud Functions backed by a Firestore counter. After **5 failed attempts in 15 minutes**, the account is locked for **15 minutes**. The counter collection (`loginAttempts`) is locked down to `allow read, write: if false` in `firestore.rules`, so only the trusted server code (Admin SDK) can touch it — a user cannot reset their own lockout from the browser console. |
| **Encrypted passwords** | Passwords are never stored or even seen by our own code — `createUserWithEmailAndPassword`/`signInWithEmailAndPassword` send credentials straight to Firebase Auth over HTTPS, which stores only a **scrypt-hashed** password. There is no password field anywhere in Firestore. |
| **Generic errors** | `toGenericAuthMessage()` in `src/utils/validation.js` maps `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, etc. all to the single message **"Invalid email or password."** — this prevents attackers from using the login form to discover which emails are registered (user enumeration). |
| **Firebase Auth in React** | `src/context/AuthContext.jsx` wraps the app in a `useAuth()` provider handling `signup`, `login`, `logout`, and session persistence via `onAuthStateChanged`. |

### Notes and recommended next steps

- **Firestore rules are the real access-control boundary.** Anything in
  `src/utils/validation.js` is a convenience for users, not a security
  control — a modified client or a direct API call bypasses it entirely.
  Always assume the client is hostile.
- **HTTPS is enforced by Firebase Hosting/Auth automatically** — no extra
  config needed once deployed.
- For production, also turn on **Firebase App Check** (reCAPTCHA v3 /
  Enterprise) to block scripted signups and bot traffic before requests even
  reach Firestore or Functions, and enable **email verification**
  (`sendEmailVerification`) so only confirmed emails can book or list
  services.
- The `verified` badge on worker profiles is a manual/admin-controlled flag
  (`firestore.rules` blocks users from setting it on themselves) — wire up
  an admin panel or manual review process to flip it once you verify a
  worker's ID/credentials.
- `src/data/mockWorkers.js` is placeholder data so the UI is fully
  browsable immediately. Swap `getWorkersByCategory` for a real Firestore
  query against the `workers` collection when you're ready.

## Project structure

```
src/
  components/     Navbar, WorkerCard, ProtectedRoute
  context/        AuthContext (Firebase Auth wiring)
  data/           categories.js, mockWorkers.js (placeholder data)
  pages/          Home, Login, Signup, CategoryPage, WorkerProfile, Dashboard
  utils/          validation.js, rateLimiter.js
  firebase.js     Firebase app initialization
functions/
  index.js        Cloud Functions: server-side rate limiting
firestore.rules    Server-side data validation & access control
```
