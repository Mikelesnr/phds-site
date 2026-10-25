import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getEcho } from '@/lib/echo';
import { playSound } from '@/lib/sound';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { NotificationItem, SharedProps } from '@/types';

function ago(iso: string | null): string {
    if (!iso) return '';
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(iso).toLocaleDateString();
}

/** The bell in the back office header. Live over websockets, or by polling when those are off. */
export function NotificationBell() {
    const { auth, realtime } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const wrapper = useRef<HTMLDivElement>(null);
    // What we had already seen, so only genuinely new notifications make a sound.
    const seen = useRef<Map<string, string | null> | null>(null);

    /** True when this conversation is the one on screen, where the chat plays its own sound. */
    const isOpenConversation = (conversationId: number) =>
        !document.hidden && window.location.pathname === `${routes.teamChat}/${conversationId}`;

    const load = useCallback((announce = false) => {
        axios
            .get<{ unread: number; items: NotificationItem[] }>(routes.notifications)
            .then(({ data }) => {
                setUnread(data.unread);
                setItems(data.items);

                const previous = seen.current;
                seen.current = new Map(data.items.map((item) => [item.id, item.created_at]));

                // First load is the baseline. After that, a new or updated unread item is news.
                if (announce && previous) {
                    const fresh = data.items.filter(
                        (item) =>
                            !item.read &&
                            item.data.kind !== 'removed' &&
                            previous.get(item.id) !== item.created_at &&
                            !isOpenConversation(item.data.conversation_id),
                    );
                    if (fresh.length > 0) playSound('notify');
                }
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const echo = getEcho(realtime);

        if (echo) {
            const channel = echo.private(`App.Models.User.${auth.user.id}`);
            channel.listen(
                '.notification.created',
                (event: { notification: NotificationItem }) => {
                    const { kind, conversation_id } = event.notification.data;
                    setItems((current) => [
                        event.notification,
                        ...current.filter((item) => item.id !== event.notification.id),
                    ]);
                    if (kind !== 'removed' && !isOpenConversation(conversation_id)) playSound('notify');
                    load();
                },
            );
            return () => {
                channel.stopListening('.notification.created');
            };
        }

        const timer = window.setInterval(() => load(true), (realtime?.pollSeconds ?? 6) * 1000);
        return () => window.clearInterval(timer);
    }, [realtime, auth.user.id, load]);

    useEffect(() => {
        if (!open) return;
        const onDown = (event: PointerEvent) => {
            if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const markRead = async (item: NotificationItem) => {
        if (!item.read) {
            await axios.post(`${routes.notifications}/${item.id}/read`).catch(() => undefined);
            load();
        }
        setOpen(false);
        if (item.data.url) router.visit(item.data.url);
    };

    const markAll = async () => {
        await axios.post(`${routes.notifications}/read-all`).catch(() => undefined);
        load();
    };

    return (
        <div ref={wrapper} className="relative">
            <button
                type="button"
                onClick={() => {
                    setOpen((value) => !value);
                    load();
                }}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                className="relative inline-flex size-10 items-center justify-center rounded-full border border-border transition hover:bg-muted"
            >
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 && (
                    <span
                        data-testid="bell-count"
                        className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground"
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
                >
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <h2 className="font-sans text-base font-bold">Notifications</h2>
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAll()}
                                className="inline-flex items-center gap-1 text-sm font-bold text-highlight hover:underline"
                            >
                                <CheckCheck className="size-4" aria-hidden="true" /> Mark all read
                            </button>
                        )}
                    </div>
                    <ul className="max-h-96 overflow-y-auto">
                        {items.length === 0 && (
                            <li className="px-4 py-8 text-center text-muted-foreground">Nothing yet.</li>
                        )}
                        {items.map((item) => (
                            <li key={item.id} className="border-b border-border last:border-0">
                                <button
                                    type="button"
                                    onClick={() => void markRead(item)}
                                    className={cn(
                                        'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-muted',
                                        !item.read && 'bg-accent/10',
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'mt-2 size-2 shrink-0 rounded-full',
                                            item.read ? 'bg-transparent' : 'bg-highlight',
                                        )}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="truncate font-bold">{item.data.title}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {ago(item.created_at)}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                            {item.data.kind === 'message'
                                                ? `${item.data.sender}: ${item.data.preview}`
                                                : item.data.preview}
                                        </span>
                                        {item.data.kind === 'message' && item.data.count > 1 && (
                                            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                                                {item.data.count} new messages
                                            </span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
