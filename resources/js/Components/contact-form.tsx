import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const field =
    'w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-card-foreground placeholder:text-muted-foreground focus:border-lake';

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
                {label}
            </label>
            {children}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}

export function ContactForm({ interests, presetInterest }: { interests: string[]; presetInterest?: string }) {
    const form = useForm({
        name: '',
        email: '',
        organisation: '',
        interest: presetInterest ?? '',
        message: '',
        website: '',
    });

    useEffect(() => {
        if (presetInterest) form.setData('interest', presetInterest);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presetInterest]);

    return (
        <form
            id="contact-form"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                form.post(routes.contactStore, {
                    preserveScroll: true,
                    onSuccess: () => form.reset('name', 'email', 'organisation', 'message'),
                });
            }}
            className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" id="name" error={form.errors.name}>
                    <input
                        id="name"
                        autoComplete="name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        aria-invalid={Boolean(form.errors.name)}
                        aria-describedby={form.errors.name ? 'name-error' : undefined}
                        className={field}
                    />
                </Field>
                <Field label="Email" id="email" error={form.errors.email}>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        aria-invalid={Boolean(form.errors.email)}
                        aria-describedby={form.errors.email ? 'email-error' : undefined}
                        className={field}
                    />
                </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Organisation (optional)" id="organisation" error={form.errors.organisation}>
                    <input
                        id="organisation"
                        autoComplete="organization"
                        value={form.data.organisation}
                        onChange={(event) => form.setData('organisation', event.target.value)}
                        className={field}
                    />
                </Field>
                <Field label="I am interested in" id="interest" error={form.errors.interest}>
                    <select
                        id="interest"
                        value={form.data.interest}
                        onChange={(event) => form.setData('interest', event.target.value)}
                        className={cn(field, 'appearance-none')}
                    >
                        <option value="">Choose one</option>
                        {interests.map((interest) => (
                            <option key={interest} value={interest}>
                                {interest}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="Message" id="message" error={form.errors.message}>
                <textarea
                    id="message"
                    rows={6}
                    value={form.data.message}
                    onChange={(event) => form.setData('message', event.target.value)}
                    aria-invalid={Boolean(form.errors.message)}
                    aria-describedby={form.errors.message ? 'message-error' : undefined}
                    className={field}
                />
            </Field>

            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Website</label>
                <input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.data.website}
                    onChange={(event) => form.setData('website', event.target.value)}
                />
            </div>

            <button
                type="submit"
                disabled={form.processing}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
                {form.processing ? 'Sending...' : 'Send message'}
            </button>
        </form>
    );
}
