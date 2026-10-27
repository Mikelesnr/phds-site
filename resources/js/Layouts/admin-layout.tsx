import { Link, usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';
import { NotificationBell } from '@/Components/chat/notification-bell';
import { SoundToggle } from '@/Components/chat/sound-toggle';
import { LogoMark } from '@/Components/logo';
import { ThemeToggle } from '@/Components/theme-toggle';
import { FlashToast } from '@/Layouts/site-layout';
import { routes } from '@/lib/routes';
import { clearUnlessKept } from '@/lib/key-store';
import { unlockSound } from '@/lib/sound';
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

    // Browsers keep audio locked until the person clicks or presses a key once.
    useEffect(() => {
        window.addEventListener('pointerdown', unlockSound, { once: true });
        window.addEventListener('keydown', unlockSound, { once: true });
        return () => {
            window.removeEventListener('pointerdown', unlockSound);
            window.removeEventListener('keydown', unlockSound);
        };
    }, []);

    const unreadMessages = rest.team?.unreadMessages ?? 0;
    const chatActive = url.startsWith(routes.teamChat);
    const chatLink = (
        <Link
            href={routes.teamChat}
            aria-current={chatActive ? 'page' : undefined}
            className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-bold transition hover:bg-muted',
                chatActive && 'bg-muted text-highlight',
            )}
        >
            Chat
            {unreadMessages > 0 && (
                <span
                    data-testid="chat-badge"
                    className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground"
                >
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
            )}
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
                            {chatLink}
                            {auth.user.role === 'admin' &&
                                link(routes.adminUsers, 'Users', url.startsWith(routes.adminUsers))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <span>
                            {auth.user.name}{' '}
                            <span className="text-muted-foreground">
                                ({roleLabels[auth.user.role] ?? auth.user.role})
                            </span>
                        </span>
                        <SoundToggle />
                        <NotificationBell />
                        <ThemeToggle />
                        <Link
                            href="/logout"
                            onClick={() => void clearUnlessKept(auth.user.id)}
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
