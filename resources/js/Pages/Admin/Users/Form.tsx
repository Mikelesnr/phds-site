import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { routes } from '@/lib/routes';

type Role = { value: string; label: string };
type Props = {
    user: { id: number; name: string; email: string; role: string; is_me: boolean } | null;
    roles: Role[];
};

const field =
    'w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus:border-highlight focus:ring-1 focus:ring-highlight';

function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
                {label}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
            {error && <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

export default function Form({ user, roles }: Props) {
    const editing = user !== null;
    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'staff',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (user) form.put(`${routes.adminUsers}/${user.id}`);
        else form.post(routes.adminUsers);
    };

    return (
        <>
            <Head title={editing ? 'Edit user' : 'New user'} />

            <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
                <Link href={routes.adminUsers} className="text-sm font-bold text-highlight hover:underline">
                    &larr; All users
                </Link>
                <h1 className="mt-3 text-4xl font-medium">{editing ? `Edit ${user.name}` : 'New user'}</h1>

                <form onSubmit={submit} noValidate className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
                    <Field label="Name" id="name" error={form.errors.name}>
                        <input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className={field} autoComplete="off" />
                    </Field>

                    <Field label="Email" id="email" error={form.errors.email}>
                        <input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className={field} autoComplete="off" />
                    </Field>

                    <Field
                        label="Role"
                        id="role"
                        error={form.errors.role}
                        hint={
                            user?.is_me
                                ? 'You cannot change your own role.'
                                : 'Administrators manage users and featured posts. Staff write their own posts and use team chat.'
                        }
                    >
                        <select
                            id="role"
                            value={form.data.role}
                            onChange={(e) => form.setData('role', e.target.value)}
                            disabled={user?.is_me}
                            className={field}
                        >
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        label={editing ? 'New password' : 'Password'}
                        id="password"
                        error={form.errors.password}
                        hint={editing ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}
                    >
                        <input id="password" type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} className={field} autoComplete="new-password" />
                    </Field>

                    <Field label="Confirm password" id="password_confirmation">
                        <input
                            id="password_confirmation"
                            type="password"
                            value={form.data.password_confirmation}
                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                            className={field}
                            autoComplete="new-password"
                        />
                    </Field>

                    <div className="flex justify-end gap-2">
                        <Link href={routes.adminUsers} className="rounded-lg px-5 py-3 font-bold hover:bg-muted">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-lg bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-50"
                        >
                            {editing ? 'Save changes' : 'Create user'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
