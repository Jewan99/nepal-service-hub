import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';

const DEMO_MESSAGES_KEY = 'nepal-servicehub-demo-conversations';

function readDemoConversations() {
    try {
        return JSON.parse(localStorage.getItem(DEMO_MESSAGES_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeDemoConversations(conversations) {
    localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(conversations));
    window.dispatchEvent(new Event('message-data-changed'));
}

export function makeConversationId(customerId, workerId) {
    return `${customerId.length}_${customerId}_${workerId.length}_${workerId}`;
}

export async function openConversation({ user, profile, worker }) {
    if (!user?.uid || !worker?.ownerUid) {
        throw new Error('This worker profile is not connected to a messaging account.');
    }
    if (user.uid === worker.ownerUid) {
        throw new Error('You cannot message your own worker profile.');
    }

    const customerId = user.uid;
    const workerId = worker.ownerUid;
    const conversationId = makeConversationId(customerId, workerId);
    const customerName = profile?.name || user.displayName || user.email || 'Customer';

    if (firebaseReady) {
        const inboxQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', customerId));
        const inboxSnapshot = await getDocs(inboxQuery);
        const existing = inboxSnapshot.docs.find((entry) => entry.data().workerId === workerId);
        if (!existing) {
            await setDoc(doc(db, 'conversations', conversationId), {
                customerId,
                workerId,
                customerName,
                workerName: worker.name,
                participants: [customerId, workerId],
                lastMessage: '',
                lastSenderId: '',
                lastMessageId: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        return conversationId;
    }

    const conversations = readDemoConversations();
    if (!conversations[conversationId]) {
        const now = Date.now();
        conversations[conversationId] = {
            id: conversationId,
            customerId,
            workerId,
            customerName,
            workerName: worker.name,
            participants: [customerId, workerId],
            lastMessage: '',
            lastSenderId: '',
            createdAt: now,
            updatedAt: now,
            messages: [],
        };
        writeDemoConversations(conversations);
    }
    return conversationId;
}

export function subscribeInbox(uid, onUpdate, onError) {
    if (firebaseReady) {
        const inboxQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
        return onSnapshot(inboxQuery, (snapshot) => {
            onUpdate(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        }, onError);
    }

    const refresh = () => {
        const conversations = Object.values(readDemoConversations())
            .filter((conversation) => conversation.participants.includes(uid));
        onUpdate(conversations);
    };
    window.addEventListener('message-data-changed', refresh);
    refresh();
    return () => window.removeEventListener('message-data-changed', refresh);
}

export function subscribeConversation(conversationId, onUpdate, onError) {
    if (firebaseReady) {
        return onSnapshot(doc(db, 'conversations', conversationId), (snapshot) => {
            onUpdate(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        }, onError);
    }

    const refresh = () => onUpdate(readDemoConversations()[conversationId] || null);
    window.addEventListener('message-data-changed', refresh);
    refresh();
    return () => window.removeEventListener('message-data-changed', refresh);
}

export function subscribeMessages(conversationId, onUpdate, onError) {
    if (firebaseReady) {
        const messageQuery = query(
            collection(db, 'conversations', conversationId, 'messages'),
            orderBy('createdAt', 'asc'),
        );
        return onSnapshot(messageQuery, (snapshot) => {
            onUpdate(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        }, onError);
    }

    const refresh = () => onUpdate(readDemoConversations()[conversationId]?.messages || []);
    window.addEventListener('message-data-changed', refresh);
    refresh();
    return () => window.removeEventListener('message-data-changed', refresh);
}

export async function sendChatMessage({ conversationId, user, profile, text }) {
    const cleanText = String(text || '').trim();
    if (!cleanText || cleanText.length > 2000) throw new Error('Messages must be between 1 and 2,000 characters.');

    if (firebaseReady) {
        const conversationRef = doc(db, 'conversations', conversationId);
        const messageRef = doc(collection(conversationRef, 'messages'));
        const batch = writeBatch(db);
        batch.set(messageRef, {
            senderId: user.uid,
            senderName: profile?.name || user.displayName || user.email || 'ServiceHub member',
            text: cleanText,
            createdAt: serverTimestamp(),
        });
        batch.update(conversationRef, {
            lastMessage: cleanText,
            lastSenderId: user.uid,
            lastMessageId: messageRef.id,
            updatedAt: serverTimestamp(),
        });
        await batch.commit();
        return;
    }

    const conversations = readDemoConversations();
    const conversation = conversations[conversationId];
    if (!conversation || !conversation.participants.includes(user.uid)) {
        throw new Error('This conversation is not available to your account.');
    }
    const message = {
        id: `demo-message-${crypto.randomUUID()}`,
        senderId: user.uid,
        senderName: profile?.name || user.displayName || user.email || 'ServiceHub member',
        text: cleanText,
        createdAt: Date.now(),
    };
    conversation.messages.push(message);
    conversation.lastMessage = cleanText;
    conversation.lastSenderId = user.uid;
    conversation.lastMessageId = message.id;
    conversation.updatedAt = message.createdAt;
    writeDemoConversations(conversations);
}

export function timestampMillis(timestamp) {
    if (typeof timestamp === 'number') return timestamp;
    return timestamp?.toMillis?.() || 0;
}