import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Globe,
    Lock,
    MessageSquarePlus,
    Send,
    Settings,
    Users,
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
import { MessageBubble } from '@/Components/chat/message-bubble';
import { getEcho, socketHeaders } from '@/lib/echo';
import { routes } from '@/lib/routes';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import type {
    ChatConversation,
    ChatMessage,
    ChatPerson,
    ChatSidebar,
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

type Dialog = 'direct' | 'group' | 'browse' | 'admin' | 'members' | null;

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

    const [dialog, setDialog] = useState<Dialog>(null);
    const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages ?? []);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(96);
    const stickToBottom = useRef(true);
    const conversationId = conversation?.id ?? null;

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
        }
        lastConversationId.current = conversationId;

        setMessages(incoming);
        stickToBottom.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation]);

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

    const markRead = useCallback(() => {
        if (conversationId && !document.hidden) {
            axios.post(`${routes.teamChat}/${conversationId}/read`).catch(() => undefined);
        }
    }, [conversationId]);

    // Live updates over websockets...
    useEffect(() => {
        if (!echo) return;

        const user = echo.private(`App.Models.User.${me.id}`);
        user.listen('.notification.created', (event: { notification: { data: { kind: string; conversation_id: number } } }) => {
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
                    setMessages((current) =>
                        current.some((m) => m.id === message.id) ? current : [...current, message],
                    );
                    markRead();
                })
                .listen('.message.updated', ({ message }: { message: ChatMessage }) =>
                    setMessages((current) => current.map((m) => (m.id === message.id ? message : m))),
                )
                .listen('.message.deleted', ({ message }: { message: ChatMessage }) =>
                    setMessages((current) => current.map((m) => (m.id === message.id ? message : m))),
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
    }, [messages, conversationId]);

    const send = async () => {
        const body = draft.trim();
        if (!body || !conversationId || sending) return;

        setSending(true);
        setError(null);
        try {
            const { data } = await axios.post<{ message: ChatMessage }>(
                `${routes.teamChat}/${conversationId}/messages`,
                { body },
                { headers: socketHeaders(echo) },
            );
            stickToBottom.current = true;
            setMessages((current) =>
                current.some((m) => m.id === data.message.id) ? current : [...current, data.message],
            );
            setDraft('');
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

    const edit = async (message: ChatMessage, body: string) => {
        const { data } = await axios.patch<{ message: ChatMessage }>(
            `${routes.teamChat}/messages/${message.id}`,
            { body },
            { headers: socketHeaders(echo) },
        );
        setMessages((current) => current.map((m) => (m.id === message.id ? data.message : m)));
    };

    const remove = async (message: ChatMessage) => {
        const { data } = await axios.delete<{ message: ChatMessage }>(
            `${routes.teamChat}/messages/${message.id}`,
            { headers: socketHeaders(echo) },
        );
        setMessages((current) => current.map((m) => (m.id === message.id ? data.message : m)));
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
                    {conversation ? (
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
                                        No messages yet. Say hello.
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
                                                mine={message.user_id === me.id}
                                                canDelete={message.user_id === me.id || conversation.is_moderator}
                                                onEdit={edit}
                                                onDelete={remove}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void send();
                                }}
                                className="border-t border-border p-3"
                            >
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
                                        placeholder="Write a message"
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
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
                            <span className="inline-flex size-16 items-center justify-center rounded-full bg-accent/20 text-highlight">
                                <MessageSquarePlus className="size-8" aria-hidden="true" />
                            </span>
                            <h2 className="text-3xl font-medium">Team chat</h2>
                            <p className="max-w-sm text-muted-foreground">
                                Pick a conversation, message someone directly, or start a group for a project.
                            </p>
                            {joinable.length > 0 && (
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    {joinable.length === 1 ? 'There is 1 open group' : `There are ${joinable.length} open groups`}{' '}
                                    you can join. Find {joinable.length === 1 ? 'it' : 'them'} under Open groups to join on the left.
                                </p>
                            )}
                            <div className="flex flex-wrap justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDialog('direct')}
                                    className="rounded-lg bg-accent px-5 py-2.5 font-bold text-accent-foreground"
                                >
                                    New message
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDialog('group')}
                                    className="rounded-lg border border-border px-5 py-2.5 font-bold hover:bg-muted"
                                >
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
        </>
    );
}
