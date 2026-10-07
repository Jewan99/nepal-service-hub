import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { firebaseReady } from '../firebase';
import useWorkerDirectory from '../hooks/useWorkerDirectory';
import {
    openConversation,
    sendChatMessage,
    subscribeConversation,
    subscribeInbox,
    subscribeMessages,
    timestampMillis,
} from '../utils/messaging';

function formatTime(timestamp) {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp?.toDate?.();
    if (!date) return '';
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDate(timestamp) {
    const value = typeof timestamp === 'number' ? new Date(timestamp) : timestamp?.toDate?.();
    if (!value) return '';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(value);
}

export default function Messages() {
    const { conversationId, workerUid } = useParams();
    const { user, profile } = useAuth();
    const { workers, loading: workersLoading } = useWorkerDirectory();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!user?.uid) return undefined;
        return subscribeInbox(user.uid, setConversations, () => setError('Could not load your inbox.'));
    }, [user?.uid]);

    useEffect(() => {
        if (!workerUid || workersLoading) return undefined;
        const worker = workers.find((entry) => entry.ownerUid === workerUid);
        if (!worker) {
            setError('This worker profile is not linked to a messaging account.');
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        setLoading(true);
        setError('');
        openConversation({ user, profile, worker })
            .then((id) => {
                if (!cancelled) navigate(`/messages/${id}`, { replace: true });
            })
            .catch((startError) => {
                if (cancelled) return;
                setError(startError.message || 'Could not start this conversation.');
                setLoading(false);
            });
        return () => { cancelled = true; };
    }, [workerUid, workers, workersLoading, user, profile, navigate]);

    useEffect(() => {
        if (!conversationId) {
            setConversation(null);
            setMessages([]);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        setError('');
        const stopConversation = subscribeConversation(conversationId, (nextConversation) => {
            if (nextConversation && !nextConversation.participants.includes(user.uid)) {
                setError('This conversation is not available to your account.');
                setConversation(null);
            } else {
                setConversation(nextConversation);
            }
            setLoading(false);
        }, () => {
            setError('Could not open this conversation. Check that you are one of its participants.');
            setLoading(false);
        });
        const stopMessages = subscribeMessages(conversationId, setMessages, () => {
            setError('Could not load messages for this conversation.');
            setLoading(false);
        });
        return () => {
            stopConversation();
            stopMessages();
        };
    }, [conversationId, user?.uid]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages]);

    const sortedConversations = useMemo(
        () => [...conversations].sort((left, right) => timestampMillis(right.updatedAt) - timestampMillis(left.updatedAt)),
        [conversations],
    );
    const otherName = conversation?.workerId === user?.uid ? conversation?.customerName : conversation?.workerName;

    async function handleSend(event) {
        event.preventDefault();
        if (!draft.trim() || !conversationId) return;
        setSending(true);
        setError('');
        try {
            await sendChatMessage({ conversationId, user, profile, text: draft });
            setDraft('');
        } catch (sendError) {
            setError(sendError.message || 'Could not send your message.');
        } finally {
            setSending(false);
        }
    }

    return (
        <main className="container messages-page">
            <header className="messages-heading">
                <div>
                    <span className="section-kicker">SERVICEHUB MESSAGES</span>
                    <h1>Messages</h1>
                    <p>Talk directly with the people doing the work.</p>
                </div>
                {!firebaseReady && <span className="demo-mode-tag">Local demo · this browser only</span>}
            </header>

            {!firebaseReady && (
                <p className="messages-demo-note">Demo messages are stored only in this browser. Configure Firebase to chat across devices.</p>
            )}

            <div className={`messages-layout${conversationId ? ' has-conversation' : ''}`}>
                <aside className="inbox-panel" aria-label="Conversation list">
                    <div className="inbox-panel-heading">
                        <h2>Inbox</h2>
                        <span>{sortedConversations.length}</span>
                    </div>
                    {sortedConversations.length ? (
                        <div className="conversation-list">
                            {sortedConversations.map((entry) => {
                                const contactName = entry.workerId === user.uid ? entry.customerName : entry.workerName;
                                return (
                                    <Link
                                        key={entry.id}
                                        to={`/messages/${entry.id}`}
                                        className={`conversation-row${conversationId === entry.id ? ' active' : ''}`}
                                    >
                                        <span className="conversation-avatar">{(contactName || 'U').slice(0, 1).toUpperCase()}</span>
                                        <span className="conversation-preview">
                                            <strong>{contactName}</strong>
                                            <span>{entry.lastMessage || 'Conversation started'}</span>
                                        </span>
                                        <time>{formatDate(entry.updatedAt)}</time>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="inbox-empty">
                            <span aria-hidden="true">✉</span>
                            <strong>No messages yet</strong>
                            <p>Open a worker profile and start a conversation.</p>
                            <Link to="/home">Browse workers</Link>
                        </div>
                    )}
                </aside>

                <section className="thread-panel" aria-label="Message thread">
                    {conversationId && conversation ? (
                        <>
                            <header className="thread-header">
                                <Link to="/messages" className="thread-back" aria-label="Back to inbox">←</Link>
                                <span className="conversation-avatar">{(otherName || 'U').slice(0, 1).toUpperCase()}</span>
                                <div><strong>{otherName}</strong><span>{conversation.workerId === user.uid ? 'Customer' : 'Service provider'}</span></div>
                            </header>
                            <div className="message-history" aria-live="polite">
                                {messages.length ? messages.map((message) => (
                                    <article key={message.id} className={`message-bubble${message.senderId === user.uid ? ' own-message' : ''}`}>
                                        <span>{message.senderName}</span>
                                        <p>{message.text}</p>
                                        <time>{formatTime(message.createdAt)}</time>
                                    </article>
                                )) : (
                                    <div className="thread-empty"><strong>Start the conversation</strong><p>Ask about availability, timing, or the work you need.</p></div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            {error && <p className="message-error" role="alert">{error}</p>}
                            <form className="message-composer" onSubmit={handleSend}>
                                <textarea
                                    aria-label="Write a message"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                                    placeholder="Write a message…"
                                    rows={2}
                                    maxLength={2000}
                                />
                                <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send'}</button>
                            </form>
                        </>
                    ) : conversationId || workerUid ? (
                        <div className="thread-empty">
                            <strong>{loading ? 'Opening conversation…' : 'Conversation unavailable'}</strong>
                            {error && <p className="message-error" role="alert">{error}</p>}
                        </div>
                    ) : (
                        <div className="thread-empty thread-placeholder">
                            <span aria-hidden="true">✉</span>
                            <strong>Select a conversation</strong>
                            <p>Your messages with customers and service providers will appear here.</p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}