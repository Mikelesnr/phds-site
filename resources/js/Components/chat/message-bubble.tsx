import { Check, Forward, Lock, MoreHorizontal, Pencil, Reply, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { colorFor, ownBubble } from './bubble-colors';

export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** A message as the reader sees it, after decryption. */
export type MessageView = {
    state: 'ok' | 'waiting' | 'error';
    text?: string;
    forwarded?: { author: string; at: string };
    reply?: { author: string; excerpt: string } | 'unavailable' | null;
    replyId?: string;
};

type Props = {
    message: ChatMessage;
    view: MessageView;
    mine: boolean;
    canDelete: boolean;
    highlighted: boolean;
    onEdit: (message: ChatMessage, text: string) => Promise<void>;
    onDelete: (message: ChatMessage) => Promise<void>;
    onReply: (message: ChatMessage) => void;
    onForward: (message: ChatMessage) => void;
    onJump: (id: string) => void;
};

/**
 * One bubble, used for direct chats and groups alike: yours on the right in
 * lime, everyone else's on the left in their own colour. Each shows who sent it,
 * when, and what they said, with any reply or forward shown above the text.
 */
export function MessageBubble({
    message,
    view,
    mine,
    canDelete,
    highlighted,
    onEdit,
    onDelete,
    onReply,
    onForward,
    onJump,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [menuOpen]);

    const colors = mine ? ownBubble : colorFor(message.sender_id);
    const readable = view.state === 'ok' && !message.deleted;
    const canEdit = mine && readable;

    const save = async () => {
        const text = draft.trim();
        if (!text || text === view.text) {
            setEditing(false);
            return;
        }
        setBusy(true);
        try {
            await onEdit(message, text);
            setEditing(false);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await onDelete(message);
        } finally {
            setBusy(false);
            setConfirming(false);
        }
    };

    const item =
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium hover:bg-muted';

    return (
        <div
            id={`msg-${message.id}`}
            data-testid="message"
            data-mine={mine}
            className={cn('group flex rounded-2xl transition', mine ? 'justify-end' : 'justify-start', highlighted && 'bg-highlight/20')}
        >
            <div
                className={cn(
                    'relative max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]',
                    message.deleted ? 'border border-dashed border-border text-muted-foreground' : colors.bubble,
                    mine ? 'rounded-br-md' : 'rounded-bl-md',
                )}
            >
                <div className="flex items-baseline justify-between gap-4 text-xs">
                    <span className={cn('font-bold', message.deleted ? '' : colors.name)}>{message.author}</span>
                    <span className="shrink-0 opacity-70">
                        <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                        {message.edited && <span> · edited</span>}
                    </span>
                </div>

                {message.deleted ? (
                    <p className="mt-1 text-sm italic">This message was deleted</p>
                ) : view.state === 'waiting' ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm italic opacity-80">
                        <Lock className="size-3.5" aria-hidden="true" /> Waiting for the encryption key...
                    </p>
                ) : view.state === 'error' ? (
                    <p className="mt-1 text-sm italic opacity-80">This message could not be decrypted.</p>
                ) : (
                    <>
                        {view.forwarded && (
                            <p data-testid="forwarded" className="mt-1.5 flex items-center gap-1 text-xs font-bold opacity-80">
                                <Forward className="size-3.5" aria-hidden="true" /> Forwarded from {view.forwarded.author}
                            </p>
                        )}

                        {view.reply && (
                            <button
                                type="button"
                                data-testid="reply-quote"
                                disabled={view.reply === 'unavailable'}
                                onClick={() => view.replyId && onJump(view.replyId)}
                                className="mt-1.5 block w-full rounded-lg border-l-4 border-current/50 bg-black/10 px-3 py-1.5 text-left text-sm dark:bg-white/10"
                            >
                                {view.reply === 'unavailable' ? (
                                    <span className="italic opacity-75">The original message is not available</span>
                                ) : (
                                    <>
                                        <span className="block text-xs font-bold opacity-80">{view.reply.author}</span>
                                        <span className="line-clamp-2 opacity-90">{view.reply.excerpt}</span>
                                    </>
                                )}
                            </button>
                        )}

                        {editing ? (
                            <div className="mt-2 space-y-2">
                                <label htmlFor={`edit-${message.id}`} className="sr-only">
                                    Edit message
                                </label>
                                <textarea
                                    id={`edit-${message.id}`}
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            void save();
                                        }
                                        if (event.key === 'Escape') setEditing(false);
                                    }}
                                    rows={Math.min(6, Math.max(2, draft.split('\n').length))}
                                    maxLength={4000}
                                    className="w-full resize-none rounded-lg border border-current/30 bg-white/60 px-3 py-2 text-base text-foreground focus:ring-0 dark:bg-black/30 dark:text-white"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-black/10"
                                    >
                                        <X className="size-4" aria-hidden="true" /> Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void save()}
                                        disabled={busy || draft.trim() === ''}
                                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                                    >
                                        <Check className="size-4" aria-hidden="true" /> Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-1 whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{view.text}</p>
                        )}
                    </>
                )}

                {confirming && (
                    <div role="alertdialog" aria-label="Delete this message?" className="mt-2 flex items-center justify-end gap-2 text-sm">
                        <span className="font-medium">Delete this message?</span>
                        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2.5 py-1 font-bold hover:bg-black/10">
                            Keep
                        </button>
                        <button
                            type="button"
                            onClick={() => void remove()}
                            disabled={busy}
                            className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white disabled:opacity-50"
                        >
                            Delete
                        </button>
                    </div>
                )}

                {!message.deleted && !editing && !confirming && (readable || canDelete) && (
                    <div ref={menuRef} className={cn('absolute top-1.5', mine ? '-left-9' : '-right-9')}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-label="Message actions"
                            aria-expanded={menuOpen}
                            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                        </button>
                        {menuOpen && (
                            <div
                                role="menu"
                                className={cn(
                                    'absolute top-8 z-20 w-40 rounded-xl border border-border bg-card p-1 text-sm text-card-foreground shadow-xl',
                                    mine ? 'left-0' : 'right-0',
                                )}
                            >
                                {readable && (
                                    <button type="button" role="menuitem" onClick={() => { onReply(message); setMenuOpen(false); }} className={item}>
                                        <Reply className="size-4" aria-hidden="true" /> Reply
                                    </button>
                                )}
                                {readable && (
                                    <button type="button" role="menuitem" onClick={() => { onForward(message); setMenuOpen(false); }} className={item}>
                                        <Forward className="size-4" aria-hidden="true" /> Forward
                                    </button>
                                )}
                                {canEdit && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setDraft(view.text ?? '');
                                            setEditing(true);
                                            setMenuOpen(false);
                                        }}
                                        className={item}
                                    >
                                        <Pencil className="size-4" aria-hidden="true" /> Edit
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setConfirming(true);
                                            setMenuOpen(false);
                                        }}
                                        className={cn(item, 'text-red-600 dark:text-red-400')}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" /> Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
