import { useState } from 'react';
import { Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarItem } from '@/types';
import { Avatar } from './dialogs';
import { Modal } from './modal';

const MAX_TARGETS = 5;

/** Choose where to send a copy of a message. It is re-encrypted for each conversation. */
export function ForwardDialog({
    preview,
    targets,
    onSend,
    onClose,
}: {
    preview: string;
    targets: SidebarItem[];
    onSend: (ids: string[]) => Promise<Record<string, string | null>>;
    onClose: () => void;
}) {
    const [picked, setPicked] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [results, setResults] = useState<Record<string, string | null> | null>(null);

    const toggle = (id: string) =>
        setPicked((current) =>
            current.includes(id)
                ? current.filter((x) => x !== id)
                : current.length < MAX_TARGETS
                  ? [...current, id]
                  : current,
        );

    const send = async () => {
        setBusy(true);
        const outcome = await onSend(picked);
        setResults(outcome);
        setBusy(false);
        if (Object.values(outcome).every((value) => value === null)) onClose();
    };

    return (
        <Modal title="Forward message" onClose={onClose}>
            <div className="space-y-4">
                <blockquote className="line-clamp-3 rounded-xl border-l-4 border-highlight bg-muted p-3 text-sm">
                    {preview}
                </blockquote>

                {targets.length === 0 ? (
                    <p className="text-muted-foreground">You have no other conversations to forward to yet.</p>
                ) : (
                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                        {targets.map((target) => (
                            <li key={target.id}>
                                <label
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted',
                                        picked.includes(target.id) && 'bg-muted',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={picked.includes(target.id)}
                                        onChange={() => toggle(target.id)}
                                    />
                                    {target.type === 'group' ? (
                                        <span className="inline-flex size-9 items-center justify-center rounded-full bg-band text-lime">
                                            {target.visibility === 'private' ? (
                                                <Lock className="size-4" aria-hidden="true" />
                                            ) : (
                                                <Globe className="size-4" aria-hidden="true" />
                                            )}
                                        </span>
                                    ) : (
                                        <Avatar name={target.title} className="size-9" />
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{target.title}</span>
                                        {results && results[target.id] && (
                                            <span className="block text-sm font-medium text-red-600 dark:text-red-400">
                                                {results[target.id]}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs text-muted-foreground">Up to {MAX_TARGETS} conversations at once.</p>

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-bold hover:bg-muted">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void send()}
                        disabled={busy || picked.length === 0}
                        className="rounded-lg bg-accent px-5 py-2.5 font-bold text-accent-foreground disabled:opacity-50"
                    >
                        {busy ? 'Sending...' : `Forward${picked.length > 0 ? ` (${picked.length})` : ''}`}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
