import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Forward,
    Globe,
    Lock,
    MessageSquarePlus,
    Send,
    Settings,
    ShieldCheck,
    TriangleAlert,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    BrowseGroupsDialog,
    GroupAdminDialog,
    GroupMembersDialog,
    NewDirectDialog,
    NewGroupDialog,
} from '@/Components/chat/dialogs';
import { ForwardDialog } from '@/Components/chat/forward-dialog';
import { MessageBubble, type MessageView } from '@/Components/chat/message-bubble';
import { SecureGate } from '@/Components/chat/secure-gate';
import { SecurityDialog } from '@/Components/chat/security-dialog';
import {
    openAll,
    useChatIdentity,
    useConversationKeys,
    useDecryptedMessages,
    useSecurityCodes,
} from '@/lib/chat-crypto';
import { getEcho, socketHeaders } from '@/lib/echo';
import { encryptEnvelope, type Envelope } from '@/lib/e2ee';
import { routes } from '@/lib/routes';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import type {
    ChatConversation,
    ChatMessage,
    ChatPerson,
    ChatSidebar,
    CryptoBlock,
    JoinableGroup,
    SharedProps,
    SidebarItem,
} from '@/types';

type Props = {
    sidebar: ChatSidebar;
    conversation: ChatConversation | null;
    people: ChatPerson[];
    joinable: JoinableGroup[];
};

type Dialog = 'direct' | 'group' | 'browse' | 'admin' | 'members' | 'security' | null;

/** Keep a thread in order, and replace a message we already have. */
function place(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
    const without = list.filter((m) => m.id !== message.id);
    return [...without, message].sort((a, b) => a.seq - b.seq);
}

function excerpt(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > 140 ? `${flat.slice(0, 140)}...` : flat;
}

function dayLabel(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

function shortTime(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function ConversationRow({ item, active }: { item: SidebarItem; active: boolean }) {
    return (
        <li>
            <Link
                href={`${routes.teamChat}/${item.id}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted',
                    active && 'bg-muted',
                )}
            >
                {item.type === 'group' ? (
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-band text-lime">
                        {item.visibility === 'private' ? (
                            <Lock className="size-4" aria-hidden="true" />
                        ) : (
                            <Globe className="size-4" aria-hidden="true" />
                        )}
                    </span>
                ) : (
                    <Avatar name={item.title} />
                )}
                <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                        <span className={cn('truncate', item.unread > 0 ? 'font-bold' : 'font-medium')}>
                            {item.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{shortTime(item.last_at)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-muted-foreground">{item.preview ?? 'No messages yet'}</span>
                        {item.unread > 0 && (
                            <span
                                data-testid="unread"
                                className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground"
                            >
                                {item.unread}
                            </span>
                        )}
                    </span>
                </span>
            </Link>
        </li>
    );
}

export default function ChatIndex({ sidebar, conversation, people, joinable }: Props) {
    const { auth, realtime } = usePage<SharedProps>().props;
    const me = auth.user;
    const echo = useMemo(() => getEcho(realtime), [realtime]);
    const secure = useChatIdentity(me.id);

    const [dialog, setDialog] = useState<Dialog>(null);
    const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages ?? []);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
    const [highlight, setHighlight] = useState<string | null>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(96);
    const stickToBottom = useRef(true);
    const conversationId = conversation?.id ?? null;

    // Fill exactly the space under the header, whatever height it has on this screen.
    useLayoutEffect(() => {
        const measure = () =>
            setOffset(Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 96));
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Moving to another conversation (or leaving one) always closes any open dialog.
    useEffect(() => router.on('navigate', () => setDialog(null)), []);

    const refresh = useCallback(() => {
        router.reload({
            only: ['sidebar', 'team', 'joinable', ...(conversationId ? ['conversation'] : [])],
        });
    }, [conversationId]);

    const keysShared = useCallback(() => {
        if (conversationId) router.reload({ only: ['conversation', 'sidebar'] });
    }, [conversationId]);

    const { keys, latestVersion, opening, canWrite } = useConversationKeys({
        conversation,
        identity: secure.identity,
        meId: me.id,
        onShared: keysShared,
    });
    const plain = useDecryptedMessages(messages, keys);
    const security = useSecurityCodes(conversation, me.id);

    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const lastConversationId = useRef(conversationId);

    // The server sends every message in the conversation. Whenever it sends them again, adopt them.
    useEffect(() => {
        const incoming = conversation?.messages ?? [];

        // Same conversation, and a message from someone else we have not shown yet: that is news.
        if (lastConversationId.current === conversationId) {
            const known = new Set(messagesRef.current.map((m) => m.id));
            if (incoming.some((m) => !known.has(m.id) && m.user_id !== me.id && !m.deleted)) {
                playSound(document.hidden ? 'notify' : 'message');
            }
        } else {
            setReplyingTo(null);
            setDraft('');
        }
        lastConversationId.current = conversationId;

        setMessages(incoming);
        stickToBottom.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation]);

    const markRead = useCallback(() => {
        if (conversationId && !document.hidden) {
            axios.post(`${routes.teamChat}/${conversationId}/read`).catch(() => undefined);
        }
    }, [conversationId]);

    // Live updates over websockets...
    useEffect(() => {
        if (!echo) return;

        const user = echo.private(`App.Models.User.${me.id}`);
        user.listen('.notification.created', (event: { notification: { data: { kind: string; conversation_id: string } } }) => {
            const { kind, conversation_id } = event.notification.data;
            if (kind === 'removed' && conversation_id === conversationId) {
                router.visit(routes.teamChat);
                return;
            }
            router.reload({ only: ['sidebar', 'team', 'joinable'] });
        });

        let channelName: string | null = null;
        if (conversationId) {
            channelName = `conversations.${conversationId}`;
            const channel = echo.private(channelName);
            channel
                .listen('.message.created', ({ message }: { message: ChatMessage }) => {
                    if (message.user_id !== me.id) playSound(document.hidden ? 'notify' : 'message');
                    setMessages((current) => place(current, message));
                    markRead();
                })
                .listen('.message.updated', ({ message }: { message: ChatMessage }) =>
                    setMessages((current) => place(current, message)),
                )
                .listen('.message.deleted', ({ message }: { message: ChatMessage }) =>
                    setMessages((current) => place(current, message)),
                )
                .listen('.conversation.changed', ({ change }: { change: string }) => {
                    if (change === 'deleted') router.visit(routes.teamChat);
                    else refresh();
                });
        }

        return () => {
            user.stopListening('.notification.created');
            if (channelName) echo.leave(channelName);
        };
    }, [echo, me.id, conversationId, markRead, refresh]);

    // ...or a gentle poll when websockets are not switched on.
    useEffect(() => {
        if (echo) return;
        const timer = window.setInterval(() => {
            if (!document.hidden) refresh();
        }, (realtime?.pollSeconds ?? 6) * 1000);
        return () => window.clearInterval(timer);
    }, [echo, realtime?.pollSeconds, refresh]);

    useEffect(() => {
        const element = scroller.current;
        if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
    }, [messages, conversationId, keys]);

    /** What a reader sees for a message: its decrypted text, a reply quote, a forward label. */
    const viewOf = useCallback(
        (message: ChatMessage): MessageView => {
            if (message.deleted) return { state: 'ok' };

            const opened = plain(message);
            if (!opened) return { state: 'waiting' };
            if (!opened.ok) return { state: 'error' };

            const { env } = opened;
            let reply: MessageView['reply'] = null;

            if (env.reply) {
                const target = messages.find((m) => m.id === env.reply?.id);
                const targetPlain = target && !target.deleted ? plain(target) : null;
                reply =
                    target && targetPlain && targetPlain.ok
                        ? { author: target.author, excerpt: excerpt(targetPlain.env.text) }
                        : 'unavailable';
            }

            return { state: 'ok', text: env.text, forwarded: env.forwarded, reply, replyId: env.reply?.id };
        },
        [plain, messages],
    );

    /** Encrypt and send, retrying a flaky connection with the very same message so it never doubles. */
    const post = async (target: string, body: { id: string; ciphertext: string; iv: string; key_version: number }) => {
        for (let attempt = 1; ; attempt++) {
            try {
                const { data } = await axios.post<{ message: ChatMessage }>(
                    `${routes.teamChat}/${target}/messages`,
                    body,
                    { headers: socketHeaders(echo) },
                );
                return data.message;
            } catch (caught) {
                const offline = axios.isAxiosError(caught) && !caught.response;
                if (!offline || attempt >= 3) throw caught;
            }
        }
    };

    const send = async () => {
        const text = draft.trim();
        const key = latestVersion !== null ? keys.get(latestVersion) : undefined;
        if (!text || !conversationId || sending || !key || latestVersion === null) return;

        setSending(true);
        setError(null);
        try {
            const id = crypto.randomUUID();
            const envelope: Envelope = { v: 1, text, ...(replyingTo ? { reply: { id: replyingTo.id } } : {}) };
            const sealed = await encryptEnvelope(key, envelope, {
                conversationId,
                messageId: id,
                senderId: me.id,
                version: latestVersion,
            });

            const saved = await post(conversationId, { id, ...sealed, key_version: latestVersion });
            stickToBottom.current = true;
            setMessages((current) => place(current, saved));
            setDraft('');
            setReplyingTo(null);
            router.reload({ only: ['sidebar', 'team'] });
        } catch (caught) {
            setError(
                axios.isAxiosError(caught) && caught.response?.status === 429
                    ? 'You are sending messages too quickly. Please wait a moment.'
                    : 'The message could not be sent. Please try again.',
            );
        } finally {
            setSending(false);
        }
    };

    const edit = async (message: ChatMessage, text: string) => {
        const opened = plain(message);
        const key = latestVersion !== null ? keys.get(latestVersion) : undefined;
        if (!opened?.ok || !key || latestVersion === null) return;

        // Keep the reply or forward label, change only the words.
        const sealed = await encryptEnvelope(key, { ...opened.env, text }, {
            conversationId: message.conversation_id,
            messageId: message.id,
            senderId: message.sender_id,
            version: latestVersion,
        });

        const { data } = await axios.patch<{ message: ChatMessage }>(
            `${routes.teamChat}/messages/${message.id}`,
            { ...sealed, key_version: latestVersion },
            { headers: socketHeaders(echo) },
        );
        setMessages((current) => place(current, data.message));
    };

    const remove = async (message: ChatMessage) => {
        const { data } = await axios.delete<{ message: ChatMessage }>(
            `${routes.teamChat}/messages/${message.id}`,
            { headers: socketHeaders(echo) },
        );
        setMessages((current) => place(current, data.message));
    };

    /** Forward: decrypt here, then encrypt again for each chosen conversation. */
    const forward = async (message: ChatMessage, targets: string[]): Promise<Record<string, string | null>> => {
        const opened = plain(message);
        const results: Record<string, string | null> = {};
        if (!opened?.ok || !secure.identity) return Object.fromEntries(targets.map((id) => [id, 'Could not read the message.']));

        for (const target of targets) {
            try {
                const { data } = await axios.get<CryptoBlock>(`${routes.teamChat}/${target}/keys`);
                const held = await openAll(data.my_keys, secure.identity);

                if (held.size === 0) {
                    results[target] = 'This chat has no key for you yet. Open it once, then try again.';
                    continue;
                }

                const version = Math.max(...held.keys());
                const id = crypto.randomUUID();
                const sealed = await encryptEnvelope(
                    held.get(version)!,
                    {
                        v: 1,
                        text: opened.env.text,
                        // Forwarding a forward keeps pointing at the original author.
                        forwarded: opened.env.forwarded ?? { author: message.author, at: message.created_at },
                    },
                    { conversationId: target, messageId: id, senderId: me.id, version },
                );

                const saved = await post(target, { id, ...sealed, key_version: version });
                if (target === conversationId) setMessages((current) => place(current, saved));
                results[target] = null;
            } catch {
                results[target] = 'Could not forward to this chat.';
            }
        }

        router.reload({ only: ['sidebar', 'team'] });
        return results;
    };

    const jumpTo = (id: string) => {
        document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setHighlight(id);
        window.setTimeout(() => setHighlight(null), 1600);
    };

    const groups = useMemo(() => {
        const out: Array<{ day: string; items: ChatMessage[] }> = [];
        for (const message of messages) {
            const day = dayLabel(message.created_at);
            const last = out[out.length - 1];
            if (last && last.day === day) last.items.push(message);
            else out.push({ day, items: [message] });
        }
        return out;
    }, [messages]);

    const isGroup = conversation?.type === 'group';
    const replyView = replyingTo ? viewOf(replyingTo) : null;
    const forwardTargets = [...sidebar.groups, ...sidebar.direct];
    const mayStart = conversation ? conversation.type === 'direct' || conversation.is_moderator : false;

    const waitingNotice = (() => {
        if (!conversation) return '';
        if (!conversation.crypto.provisioned && !mayStart) {
            return `Waiting for ${isGroup ? 'the group moderator' : 'the other person'} to open this chat so it can be secured.`;
        }
        return 'Waiting for the encryption key. It is shared with you automatically when someone who has it opens this chat.';
    })();

    return (
        <>
            <Head title="Team chat" />

            <div
                style={{ height: `calc(100dvh - ${offset}px)` }}
                className="mx-auto flex min-h-[26rem] w-full max-w-6xl gap-4 px-0 py-0 sm:px-8 sm:py-6"
            >
                {/* Conversation list */}
                <aside
                    aria-label="Conversations"
                    className={cn(
                        'w-full shrink-0 flex-col overflow-hidden border-border bg-card text-card-foreground sm:rounded-3xl sm:border lg:flex lg:w-80',
                        conversation ? 'hidden' : 'flex',
                    )}
                >
                    <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                        <h1 className="text-2xl font-medium">Chat</h1>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setDialog('group')}
                                aria-label="New group"
                                title="New group"
                                className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
                            >
                                <Users className="size-5" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setDialog('direct')}
                                aria-label="New message"
                                title="New message"
                                className="inline-flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
                            >
                                <MessageSquarePlus className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        <h2 className="px-3 pb-1 pt-3 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Groups
                        </h2>
                        <ul>
                            {sidebar.groups.length === 0 && (
                                <li className="px-3 py-2 text-sm text-muted-foreground">
                                    No groups yet. Create one or browse open groups.
                                </li>
                            )}
                            {sidebar.groups.map((item) => (
                                <ConversationRow key={item.id} item={item} active={item.id === conversationId} />
                            ))}
                        </ul>

                        {joinable.length > 0 && (
                            <>
                                <h2 className="px-3 pb-1 pt-5 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    Open groups to join
                                </h2>
                                <ul data-testid="open-groups">
                                    {joinable.slice(0, 4).map((group) => (
                                        <li key={group.id} className="flex items-center gap-3 rounded-xl px-3 py-2">
                                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-highlight text-highlight">
                                                <Globe className="size-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium">{group.name}</span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {group.members} {group.members === 1 ? 'member' : 'members'}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => router.post(`${routes.teamChat}/${group.id}/join`)}
                                                aria-label={`Join ${group.name}`}
                                                className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground"
                                            >
                                                Join
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                {joinable.length > 4 && (
                                    <button
                                        type="button"
                                        onClick={() => setDialog('browse')}
                                        className="mt-1 px-3 py-1 text-sm font-bold text-highlight hover:underline"
                                    >
                                        See all {joinable.length} open groups
                                    </button>
                                )}
                            </>
                        )}

                        <h2 className="px-3 pb-1 pt-5 font-sans text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Direct messages
                        </h2>
                        <ul>
                            {sidebar.direct.length === 0 && (
                                <li className="px-3 py-2 text-sm text-muted-foreground">
                                    No conversations yet. Start one with the button above.
                                </li>
                            )}
                            {sidebar.direct.map((item) => (
                                <ConversationRow key={item.id} item={item} active={item.id === conversationId} />
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Thread */}
                <section
                    aria-label="Conversation"
                    className={cn(
                        'min-w-0 flex-1 flex-col overflow-hidden border-border bg-card text-card-foreground sm:rounded-3xl sm:border',
                        conversation ? 'flex' : 'hidden lg:flex',
                    )}
                >
                    {secure.status !== 'ready' ? (
                        <SecureGate
                            status={secure.status}
                            onSetup={secure.setup}
                            onUnlock={secure.unlock}
                            onReset={secure.reset}
                        />
                    ) : conversation ? (
                        <>
                            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                                <Link
                                    href={routes.teamChat}
                                    aria-label="Back to conversations"
                                    className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted lg:hidden"
                                >
                                    <ArrowLeft className="size-5" aria-hidden="true" />
                                </Link>
                                {isGroup ? (
                                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-band text-lime">
                                        {conversation.visibility === 'private' ? (
                                            <Lock className="size-4" aria-hidden="true" />
                                        ) : (
                                            <Globe className="size-4" aria-hidden="true" />
                                        )}
                                    </span>
                                ) : (
                                    <Avatar name={conversation.title} />
                                )}
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate font-sans text-lg font-bold">{conversation.title}</h2>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {isGroup
                                            ? `${conversation.visibility === 'private' ? 'Private' : 'Open'} group · ${conversation.members.length} ${conversation.members.length === 1 ? 'member' : 'members'}`
                                            : 'Direct message'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDialog('security')}
                                    aria-label="Encryption details"
                                    title="End-to-end encrypted. See security codes."
                                    className="inline-flex size-10 items-center justify-center rounded-full text-highlight hover:bg-muted"
                                >
                                    <ShieldCheck className="size-5" aria-hidden="true" />
                                </button>
                                {isGroup &&
                                    (conversation.is_moderator ? (
                                        <button
                                            type="button"
                                            onClick={() => setDialog('admin')}
                                            aria-label="Group admin"
                                            title="Group admin"
                                            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
                                        >
                                            <Settings className="size-5" aria-hidden="true" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setDialog('members')}
                                            aria-label="Group members"
                                            title="Group members"
                                            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
                                        >
                                            <Users className="size-5" aria-hidden="true" />
                                        </button>
                                    ))}
                            </header>

                            {security.changed.length > 0 && (
                                <div role="alert" data-testid="code-changed" className="flex flex-wrap items-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm">
                                    <TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        The security code for{' '}
                                        <strong>
                                            {security.changed
                                                .map((id) => conversation.members.find((m) => m.id === id)?.name)
                                                .filter(Boolean)
                                                .join(', ')}
                                        </strong>{' '}
                                        changed. This usually means they reset their chat key. Check it with them before sharing anything sensitive.
                                    </span>
                                    <button type="button" onClick={() => setDialog('security')} className="font-bold underline">
                                        View codes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => security.changed.forEach((id) => security.accept(id))}
                                        className="rounded-lg bg-primary px-3 py-1 font-bold text-primary-foreground"
                                    >
                                        I have checked
                                    </button>
                                </div>
                            )}

                            <div
                                ref={scroller}
                                onScroll={(event) => {
                                    const el = event.currentTarget;
                                    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                                }}
                                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/40 px-4 py-4 sm:px-10"
                            >
                                {messages.length === 0 && (
                                    <p className="py-16 text-center text-muted-foreground">
                                        No messages yet. Say hello. Messages are end-to-end encrypted.
                                    </p>
                                )}
                                {groups.map((group) => (
                                    <div key={group.day} className="space-y-3">
                                        <p className="py-1 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            {group.day}
                                        </p>
                                        {group.items.map((message) => (
                                            <MessageBubble
                                                key={message.id}
                                                message={message}
                                                view={viewOf(message)}
                                                mine={message.user_id === me.id}
                                                canDelete={message.user_id === me.id || conversation.is_moderator}
                                                highlighted={highlight === message.id}
                                                onEdit={edit}
                                                onDelete={remove}
                                                onReply={(m) => setReplyingTo(m)}
                                                onForward={(m) => setForwarding(m)}
                                                onJump={jumpTo}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {opening ? (
                                <p className="border-t border-border p-4 text-center text-sm text-muted-foreground">
                                    Opening secure conversation...
                                </p>
                            ) : !canWrite ? (
                                <p
                                    data-testid="waiting-key"
                                    className="flex items-center justify-center gap-2 border-t border-border p-4 text-center text-sm text-muted-foreground"
                                >
                                    <Lock className="size-4 shrink-0" aria-hidden="true" /> {waitingNotice}
                                </p>
                            ) : (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void send();
                                    }}
                                    className="border-t border-border p-3"
                                >
                                    {replyingTo && replyView && (
                                        <div data-testid="replying-to" className="mb-2 flex items-start gap-3 rounded-xl border-l-4 border-highlight bg-muted px-3 py-2 text-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-highlight">Replying to {replyingTo.author}</p>
                                                <p className="line-clamp-2">{replyView.text ? excerpt(replyView.text) : 'Message'}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReplyingTo(null)}
                                                aria-label="Cancel reply"
                                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-background"
                                            >
                                                <X className="size-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    )}
                                    {error && (
                                        <p role="alert" className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">
                                            {error}
                                        </p>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <label htmlFor="message-input" className="sr-only">
                                            Message
                                        </label>
                                        <textarea
                                            id="message-input"
                                            rows={1}
                                            value={draft}
                                            maxLength={4000}
                                            onChange={(event) => setDraft(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                    event.preventDefault();
                                                    void send();
                                                }
                                            }}
                                            placeholder="Write an encrypted message"
                                            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-base focus:border-highlight focus:ring-1 focus:ring-highlight"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || draft.trim() === ''}
                                            aria-label="Send message"
                                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                                        >
                                            <Send className="size-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                            <span className="inline-flex size-16 items-center justify-center rounded-full bg-accent/20 text-highlight">
                                <MessageSquarePlus className="size-8" aria-hidden="true" />
                            </span>
                            <h2 className="text-3xl font-medium">Team chat</h2>
                            <p className="max-w-sm text-muted-foreground">
                                Pick a conversation, message someone directly, or start a group for a project. Everything is
                                end-to-end encrypted.
                            </p>
                            {joinable.length > 0 && (
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    {joinable.length === 1 ? 'There is 1 open group' : `There are ${joinable.length} open groups`}{' '}
                                    you can join. Find {joinable.length === 1 ? 'it' : 'them'} under Open groups to join on the left.
                                </p>
                            )}
                            <div className="flex flex-wrap justify-center gap-3">
                                <button type="button" onClick={() => setDialog('direct')} className="rounded-lg bg-accent px-5 py-2.5 font-bold text-accent-foreground">
                                    New message
                                </button>
                                <button type="button" onClick={() => setDialog('group')} className="rounded-lg border border-border px-5 py-2.5 font-bold hover:bg-muted">
                                    New group
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {dialog === 'direct' && <NewDirectDialog people={people} onClose={() => setDialog(null)} />}
            {dialog === 'group' && <NewGroupDialog people={people} onClose={() => setDialog(null)} />}
            {dialog === 'browse' && <BrowseGroupsDialog groups={joinable} onClose={() => setDialog(null)} />}
            {dialog === 'admin' && conversation?.is_moderator && (
                <GroupAdminDialog conversation={conversation} people={people} onClose={() => setDialog(null)} />
            )}
            {dialog === 'members' && conversation && !conversation.is_moderator && (
                <GroupMembersDialog conversation={conversation} onClose={() => setDialog(null)} />
            )}
            {dialog === 'security' && conversation && (
                <SecurityDialog members={conversation.members} codes={security.codes} meId={me.id} onClose={() => setDialog(null)} />
            )}
            {forwarding && (
                <ForwardDialog
                    preview={viewOf(forwarding).text ?? ''}
                    targets={forwardTargets}
                    onSend={(ids) => forward(forwarding, ids)}
                    onClose={() => setForwarding(null)}
                />
            )}
        </>
    );
}
