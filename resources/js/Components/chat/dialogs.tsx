import { router, useForm } from '@inertiajs/react';
import { Globe, Lock, Search, Trash2, UserMinus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { ChatConversation, ChatPerson, JoinableGroup } from '@/types';
import { Modal } from './modal';

const field =
    'w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base text-foreground focus:border-highlight focus:ring-1 focus:ring-highlight';

function initials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function Avatar({ name, className }: { name: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-band text-sm font-bold text-lime',
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}

function PersonSearch({
    people,
    children,
}: {
    people: ChatPerson[];
    children: (visible: ChatPerson[]) => React.ReactNode;
}) {
    const [query, setQuery] = useState('');
    const visible = useMemo(
        () => people.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
        [people, query],
    );

    return (
        <>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="person-search" className="sr-only">
                    Search people
                </label>
                <input
                    id="person-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search people"
                    className={cn(field, 'pl-9')}
                />
            </div>
            <div className="mt-3">{children(visible)}</div>
        </>
    );
}

export function NewDirectDialog({ people, onClose }: { people: ChatPerson[]; onClose: () => void }) {
    return (
        <Modal title="New message" onClose={onClose}>
            <PersonSearch people={people}>
                {(visible) => (
                    <ul className="max-h-80 space-y-1 overflow-y-auto">
                        {visible.length === 0 && <li className="py-6 text-center text-muted-foreground">Nobody found.</li>}
                        {visible.map((person) => (
                            <li key={person.id}>
                                <button
                                    type="button"
                                    onClick={() => router.post(routes.teamChat + '/direct', { user_id: person.id })}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted"
                                >
                                    <Avatar name={person.name} />
                                    <span>
                                        <span className="block font-bold">{person.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            <span className="capitalize">{person.role}</span>
                                            {!person.has_keys && ' · has not set up secure chat yet'}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </PersonSearch>
        </Modal>
    );
}

export function NewGroupDialog({ people, onClose }: { people: ChatPerson[]; onClose: () => void }) {
    const form = useForm<{
        name: string;
        description: string;
        visibility: 'open' | 'private';
        members: string[];
    }>({ name: '', description: '', visibility: 'private', members: [] });

    const toggle = (id: string) =>
        form.setData(
            'members',
            form.data.members.includes(id)
                ? form.data.members.filter((m) => m !== id)
                : [...form.data.members, id],
        );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(routes.teamChat + '/groups', { onSuccess: onClose });
    };

    const errors = form.errors as Record<string, string | undefined>;

    return (
        <Modal title="New group" onClose={onClose}>
            <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                    <label htmlFor="group-name" className="mb-1.5 block text-sm font-bold">
                        Group name
                    </label>
                    <input
                        id="group-name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        maxLength={80}
                        className={field}
                        autoFocus
                    />
                    {errors.name && <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="group-description" className="mb-1.5 block text-sm font-bold">
                        What is it for? <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="group-description"
                        rows={2}
                        value={form.data.description}
                        onChange={(event) => form.setData('description', event.target.value)}
                        maxLength={300}
                        className={field}
                    />
                </div>

                <fieldset>
                    <legend className="mb-2 text-sm font-bold">Who can join?</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(
                            [
                                ['private', 'Private', 'Only people you add can see it.', Lock],
                                ['open', 'Open', 'Anyone on the site can join.', Globe],
                            ] as const
                        ).map(([value, label, hint, Icon]) => (
                            <label
                                key={value}
                                className={cn(
                                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                                    form.data.visibility === value ? 'border-highlight bg-accent/10' : 'border-border hover:bg-muted',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="visibility"
                                    value={value}
                                    checked={form.data.visibility === value}
                                    onChange={() => form.setData('visibility', value)}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="flex items-center gap-1.5 font-bold">
                                        <Icon className="size-4" aria-hidden="true" /> {label}
                                    </span>
                                    <span className="text-sm text-muted-foreground">{hint}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {form.data.visibility === 'private' ? (
                    <div>
                        <p className="mb-2 text-sm font-bold">
                            Add people <span className="font-normal text-muted-foreground">(you will be the moderator)</span>
                        </p>
                        <PersonSearch people={people}>
                            {(visible) => (
                                <ul className="max-h-48 space-y-1 overflow-y-auto">
                                    {visible.map((person) => (
                                        <li key={person.id}>
                                            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted">
                                                <input
                                                    type="checkbox"
                                                    checked={form.data.members.includes(person.id)}
                                                    onChange={() => toggle(person.id)}
                                                />
                                                <Avatar name={person.name} className="size-8 text-xs" />
                                                <span className="font-medium">{person.name}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </PersonSearch>
                    </div>
                ) : (
                    <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                        Anyone on the site can join an open group themselves from the Open groups list, so you do
                        not need to add people. Please check that list first, so you do not make a copy of a group
                        that already exists.
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg px-5 py-2.5 font-bold hover:bg-muted">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-lg bg-accent px-5 py-2.5 font-bold text-accent-foreground disabled:opacity-50"
                    >
                        Create group
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export function BrowseGroupsDialog({ groups, onClose }: { groups: JoinableGroup[]; onClose: () => void }) {
    return (
        <Modal title="Open groups" onClose={onClose}>
            {groups.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                    There are no open groups to join right now.
                </p>
            ) : (
                <ul className="space-y-3">
                    {groups.map((group) => (
                        <li key={group.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 font-bold">
                                    <Globe className="size-4 text-highlight" aria-hidden="true" /> {group.name}
                                </p>
                                {group.description && <p className="mt-0.5 text-sm text-muted-foreground">{group.description}</p>}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {group.members} {group.members === 1 ? 'member' : 'members'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.post(`${routes.teamChat}/${group.id}/join`)}
                                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
                            >
                                Join
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

/** The moderator's panel. Never shown to anyone else. */
export function GroupAdminDialog({
    conversation,
    people,
    onClose,
}: {
    conversation: ChatConversation;
    people: ChatPerson[];
    onClose: () => void;
}) {
    const base = `${routes.teamChat}/${conversation.id}`;
    const details = useForm({ name: conversation.title, description: conversation.description ?? '' });
    const [adding, setAdding] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const memberIds = new Set(conversation.members.map((m) => m.id));
    const addable = people.filter((p) => !memberIds.has(p.id));
    const errors = { ...details.errors } as Record<string, string | undefined>;

    return (
        <Modal title={`Group admin: ${conversation.title}`} onClose={onClose}>
            <div className="space-y-6">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {conversation.visibility === 'private' ? (
                        <>
                            <Lock className="size-4" aria-hidden="true" /> Private group. Only members can see it.
                        </>
                    ) : (
                        <>
                            <Globe className="size-4" aria-hidden="true" /> Open group. Anyone on the site can join.
                        </>
                    )}
                </p>

                {conversation.is_moderator && (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            details.patch(base, { preserveScroll: true });
                        }}
                        className="space-y-3"
                    >
                        <h3 className="font-sans text-base font-bold">Group details</h3>
                        <input
                            aria-label="Group name"
                            value={details.data.name}
                            onChange={(event) => details.setData('name', event.target.value)}
                            maxLength={80}
                            className={field}
                        />
                        {errors.name && <p className="text-sm font-medium text-red-600 dark:text-red-400">{errors.name}</p>}
                        <textarea
                            aria-label="Description"
                            rows={2}
                            value={details.data.description}
                            onChange={(event) => details.setData('description', event.target.value)}
                            maxLength={300}
                            className={field}
                        />
                        <button
                            type="submit"
                            disabled={details.processing}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                        >
                            Save details
                        </button>
                    </form>
                )}

                <div>
                    <h3 className="font-sans text-base font-bold">Members ({conversation.members.length})</h3>
                    <ul className="mt-2 space-y-1">
                        {conversation.members.map((member) => (
                            <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
                                <span className="flex items-center gap-3">
                                    <Avatar name={member.name} className="size-8 text-xs" />
                                    <span className="font-medium">{member.name}</span>
                                    {member.moderator && (
                                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-highlight">
                                            Moderator
                                        </span>
                                    )}
                                </span>
                                {conversation.is_moderator && !member.moderator && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.delete(`${base}/members/${member.id}`, { preserveScroll: true })
                                        }
                                        aria-label={`Remove ${member.name}`}
                                        className="inline-flex size-8 items-center justify-center rounded-full text-red-600 hover:bg-muted dark:text-red-400"
                                    >
                                        <UserMinus className="size-4" aria-hidden="true" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {conversation.visibility === 'private' && addable.length > 0 && (
                    <div>
                        <h3 className="font-sans text-base font-bold">Add people</h3>
                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                            {addable.map((person) => (
                                <li key={person.id}>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted">
                                        <input
                                            type="checkbox"
                                            checked={adding.includes(person.id)}
                                            onChange={() =>
                                                setAdding((current) =>
                                                    current.includes(person.id)
                                                        ? current.filter((id) => id !== person.id)
                                                        : [...current, person.id],
                                                )
                                            }
                                        />
                                        <span className="font-medium">{person.name}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            disabled={adding.length === 0}
                            onClick={() =>
                                router.post(`${base}/members`, { user_ids: adding }, {
                                    preserveScroll: true,
                                    onSuccess: () => setAdding([]),
                                })
                            }
                            className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
                        >
                            Add {adding.length > 0 ? adding.length : ''} selected
                        </button>
                    </div>
                )}

                {conversation.visibility === 'open' && (
                    <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                        This is an open group. Anyone on the site can join it themselves from the Open groups
                        list, so there is nobody to add.
                    </p>
                )}

                <div className="border-t border-border pt-5">
                    {conversation.can_leave && (
                        <button
                            type="button"
                            onClick={() => router.post(`${base}/leave`)}
                            className="rounded-lg border border-border px-4 py-2 font-bold hover:bg-muted"
                        >
                            Leave group
                        </button>
                    )}
                    {conversation.is_moderator &&
                        (confirmDelete ? (
                            <div role="alertdialog" className="flex flex-wrap items-center gap-3">
                                <span className="font-medium">Delete this group and all its messages?</span>
                                <button
                                    type="button"
                                    onClick={() => router.delete(base)}
                                    className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
                                >
                                    Yes, delete it
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-4 py-2 font-bold hover:bg-muted">
                                    Keep it
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 font-bold text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            >
                                <Trash2 className="size-4" aria-hidden="true" /> Delete group
                            </button>
                        ))}
                </div>
            </div>
        </Modal>
    );
}

/** What every member sees: who is in the group, and a way to leave. No controls. */
export function GroupMembersDialog({
    conversation,
    onClose,
}: {
    conversation: ChatConversation;
    onClose: () => void;
}) {
    return (
        <Modal title="Members" onClose={onClose}>
            <div className="space-y-5">
                <div>
                    <p className="font-bold">{conversation.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        {conversation.visibility === 'private' ? (
                            <>
                                <Lock className="size-4" aria-hidden="true" /> Private group
                            </>
                        ) : (
                            <>
                                <Globe className="size-4" aria-hidden="true" /> Open group
                            </>
                        )}
                    </p>
                    {conversation.description && <p className="mt-2">{conversation.description}</p>}
                </div>

                <ul className="space-y-1">
                    {conversation.members.map((member) => (
                        <li key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                            <Avatar name={member.name} className="size-8 text-xs" />
                            <span className="font-medium">{member.name}</span>
                            {member.moderator && (
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-highlight">
                                    Moderator
                                </span>
                            )}
                        </li>
                    ))}
                </ul>

                {conversation.can_leave && (
                    <div className="border-t border-border pt-5">
                        <button
                            type="button"
                            onClick={() => router.post(`${routes.teamChat}/${conversation.id}/leave`)}
                            className="rounded-lg border border-border px-4 py-2 font-bold hover:bg-muted"
                        >
                            Leave group
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
