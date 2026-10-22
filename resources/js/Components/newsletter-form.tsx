import { useForm } from '@inertiajs/react';
import { routes } from '@/lib/routes';

const input =
    'w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-band-muted focus:border-lime focus:ring-0';

export function NewsletterForm() {
    const form = useForm({ first: '', last: '', email: '', website: '' });
    const errors = form.errors as Record<string, string | undefined>;

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    name: `${data.first} ${data.last}`.trim(),
                    email: data.email,
                    website: data.website,
                }));
                form.post(routes.subscribeStore, {
                    preserveScroll: true,
                    onSuccess: () => form.reset(),
                });
            }}
            className="space-y-3"
            noValidate
        >
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="news-first" className="sr-only">
                        First name
                    </label>
                    <input
                        id="news-first"
                        value={form.data.first}
                        onChange={(event) =>
                            form.setData('first', event.target.value)
                        }
                        placeholder="First Name"
                        autoComplete="given-name"
                        aria-invalid={Boolean(errors.name)}
                        className={input}
                    />
                </div>
                <div>
                    <label htmlFor="news-last" className="sr-only">
                        Last name
                    </label>
                    <input
                        id="news-last"
                        value={form.data.last}
                        onChange={(event) =>
                            form.setData('last', event.target.value)
                        }
                        placeholder="Last Name"
                        autoComplete="family-name"
                        className={input}
                    />
                </div>
            </div>
            {errors.name && <p className="text-sm text-lime">{errors.name}</p>}
            <div>
                <label htmlFor="news-email" className="sr-only">
                    Email address
                </label>
                <input
                    id="news-email"
                    type="email"
                    value={form.data.email}
                    onChange={(event) =>
                        form.setData('email', event.target.value)
                    }
                    placeholder="Email Address"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    className={input}
                />
                {errors.email && (
                    <p className="mt-1 text-sm text-lime">{errors.email}</p>
                )}
            </div>
            {/* Honeypot: hidden from people, tempting to bots */}
            <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            >
                <label htmlFor="news-website">Website</label>
                <input
                    id="news-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.data.website}
                    onChange={(event) =>
                        form.setData('website', event.target.value)
                    }
                />
            </div>
            <button
                type="submit"
                disabled={form.processing}
                className="w-full rounded-lg bg-accent px-6 py-3.5 text-base font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
            >
                {form.processing ? 'Subscribing...' : 'Subscribe To Newsletter'}
            </button>
        </form>
    );
}
