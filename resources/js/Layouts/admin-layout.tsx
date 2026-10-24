import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { LogoMark } from '@/Components/logo';
import { ThemeToggle } from '@/Components/theme-toggle';
import { FlashToast } from '@/Layouts/site-layout';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    staff: 'Staff',
};

/** Back office frame in the same styling as the public site. Not linked from the public nav. */
export default function AdminLayout({ children }: { children: ReactNode }) {
    const { auth, ...rest } = usePage<SharedProps>().props;
    const url = usePage().url;

    const link = (href: string, label: string, active: boolean) => (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'rounded-lg px-3 py-2 text-base font-bold transition hover:bg-muted',
                active && 'bg-muted text-highlight',
            )}
        >
            {label}
        </Link>
    );

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="border-b border-border bg-nav">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <Link href={routes.home} className="flex items-center gap-2.5">
                            <LogoMark className="size-9" />
                            <span className="font-display text-xl font-semibold">
                                {rest.site.shortName}
                            </span>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Back office
                            </span>
                        </Link>
                        <nav aria-label="Back office" className="flex gap-1">
                            {link('/dashboard', 'Dashboard', url.startsWith('/dashboard'))}
                            {link(routes.adminBlogs, 'Blogs', url.startsWith(routes.adminBlogs))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <span>
                            {auth.user.name}{' '}
                            <span className="text-muted-foreground">
                                ({roleLabels[auth.user.role] ?? auth.user.role})
                            </span>
                        </span>
                        <ThemeToggle />
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="rounded-lg border border-border px-4 py-2 font-bold transition hover:bg-muted"
                        >
                            Log out
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>
            <FlashToast raised={false} />
        </div>
    );
}
