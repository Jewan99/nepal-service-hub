const DEMO_USERS_KEY = 'nepal-servicehub-demo-users';
const DEMO_SESSION_KEY = 'nepal-servicehub-demo-session';

export function readDemoUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}');
        return users && typeof users === 'object' && !Array.isArray(users) ? users : {};
    } catch {
        return {};
    }
}

export function writeDemoUsers(users) {
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

export function readDemoSession() {
    return localStorage.getItem(DEMO_SESSION_KEY);
}

export function saveDemoSession(email) {
    localStorage.setItem(DEMO_SESSION_KEY, email);
}

export function clearDemoSession() {
    localStorage.removeItem(DEMO_SESSION_KEY);
}

function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

async function derivePasswordHash(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
    }, keyMaterial, 256);
    return new Uint8Array(hash);
}

export async function hashDemoPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePasswordHash(password, salt);
    return { salt: toHex(salt), hash: toHex(hash) };
}

export async function verifyDemoPassword(password, account) {
    if (account?.passwordHash?.salt && account?.passwordHash?.hash) {
        const actual = toHex(await derivePasswordHash(password, fromHex(account.passwordHash.salt)));
        return actual === account.passwordHash.hash;
    }
    return typeof account?.password === 'string' && account.password === password;
}