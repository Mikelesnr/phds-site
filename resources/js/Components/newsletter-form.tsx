import { useForm } from '@inertiajs/react';
import { routes } from '@/lib/routes';

export function NewsletterForm() {
    const form = useForm({ name: '', email: '', website: '' });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.post(routes.subscribeStore, {
                    preserveScroll: true,
                    onSuccess: () => form.reset(),
                });
            }}
            className="space-y-3"
            noValidate
        >
            <div>
                <label htmlFor="news-name" className="sr-only">Name</label>
                <input
                    id="news-name"
                    value={form.data.name}
                    onChange={(event) => form.setData('name', event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    aria-invalid={Boolean(form.errors.name)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-band-muted focus:border-accent"
                />
                {form.errors.name && <p className="mt-1 text-sm text-accent">{form.errors.name}</p>}
            </div>
            <div>
                <label htmlFor="news-email" className="sr-only">Email</label>
                <input
                    id="news-email"
                    type="email"
                    value={form.data.email}
                    onChange={(event) => form.setData('email', event.target.value)}
                    placeholder="Your email"
                    autoComplete="email"
                    aria-invalid={Boolean(form.errors.email)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-band-muted focus:border-accent"
                />
                {form.errors.email && <p className="mt-1 text-sm text-accent">{form.errors.email}</p>}
            </div>
            {/* Honeypot: hidden from people, tempting to bots */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="news-website">Website</label>
                <input
                    id="news-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.data.website}
                    onChange={(event) => form.setData('website', event.target.value)}
                />
            </div>
            <button
                type="submit"
                disabled={form.processing}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-95 disabled:opacity-60"
            >
                {form.processing ? 'Subscribing...' : 'Subscribe for updates'}
            </button>
        </form>
    );
}
