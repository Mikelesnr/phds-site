import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/Components/chat/modal';
import { ButtonLink } from '@/Components/ui';
import AdminLayout from '@/Layouts/admin-layout';
import { routes } from '@/lib/routes';
import type { AdminUserRow } from '@/types';

export default function Index({ users }: { users: AdminUserRow[] }) {
    const [pending, setPending] = useState<AdminUserRow | null>(null);
    const errors = usePage().props.errors as Record<string, string | undefined>;

    return (
        <>
            <Head title="Users" />

            <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-medium">Users</h1>
                        <p className="mt-2 text-muted-foreground">
                            Administrators manage accounts. Staff can write posts and use team chat.
                        </p>
                    </div>
                    <ButtonLink href={`${routes.adminUsers}/create`} variant="accent">
                        <Plus className="size-4" aria-hidden="true" /> New user
                    </ButtonLink>
                </div>

                {Object.values(errors).filter(Boolean).length > 0 && (
                    <p role="alert" className="mt-6 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 font-medium text-red-700 dark:text-red-300">
                        {Object.values(errors).filter(Boolean).join(' ')}
                    </p>
                )}

                <div className="mt-8 overflow-x-auto rounded-3xl border border-border bg-card">
                    <table className="w-full text-left">
                        <thead className="border-b border-border text-sm text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3 font-bold">Name</th>
                                <th className="px-5 py-3 font-bold">Role</th>
                                <th className="hidden px-5 py-3 font-bold sm:table-cell">Posts</th>
                                <th className="hidden px-5 py-3 font-bold md:table-cell">Added</th>
                                <th className="px-5 py-3 text-right font-bold">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} data-testid="user-row">
                                    <td className="px-5 py-4">
                                        <p className="font-bold">
                                            {user.name}
                                            {user.is_me && (
                                                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                                                    You
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={
                                                user.role === 'admin'
                                                    ? 'rounded-full bg-accent/25 px-3 py-1 text-sm font-bold text-highlight'
                                                    : 'rounded-full bg-muted px-3 py-1 text-sm font-bold'
                                            }
                                        >
                                            {user.role === 'admin' ? 'Administrator' : 'Staff'}
                                        </span>
                                    </td>
                                    <td className="hidden px-5 py-4 sm:table-cell">{user.blogs_count}</td>
                                    <td className="hidden px-5 py-4 text-muted-foreground md:table-cell">{user.created_at}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-1">
                                            <Link
                                                href={`${routes.adminUsers}/${user.id}/edit`}
                                                aria-label={`Edit ${user.name}`}
                                                className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </Link>
                                            {!user.is_me && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPending(user)}
                                                    aria-label={`Delete ${user.name}`}
                                                    className="inline-flex size-9 items-center justify-center rounded-full text-red-600 hover:bg-muted dark:text-red-400"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {pending && (
                <Modal title={`Remove ${pending.name}?`} onClose={() => setPending(null)}>
                    <p className="text-muted-foreground">
                        They will no longer be able to sign in. Their blog posts stay on the site, and their chat
                        messages stay in place under the name &ldquo;Former member&rdquo;. Groups they moderate pass to
                        the longest-standing member.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <button type="button" onClick={() => setPending(null)} className="rounded-lg px-5 py-2.5 font-bold hover:bg-muted">
                            Keep user
                        </button>
                        <button
                            type="button"
                            onClick={() => router.delete(`${routes.adminUsers}/${pending.id}`, { onFinish: () => setPending(null) })}
                            className="rounded-lg bg-red-600 px-5 py-2.5 font-bold text-white"
                        >
                            Remove user
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

Index.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
