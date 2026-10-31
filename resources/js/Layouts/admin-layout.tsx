import { NotificationBell } from '@/Components/chat/notification-bell';
import { SoundToggle } from '@/Components/chat/sound-toggle';
import { LogoMark } from '@/Components/logo';
import { ThemeToggle } from '@/Components/theme-toggle';
import { FlashToast } from '@/Layouts/site-layout';
import { clearUnlessKept } from '@/lib/key-store';
import { routes } from '@/lib/routes';
import { unlockSound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';

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
                'hover:bg-muted rounded-lg px-3 py-2 text-base font-bold transition',
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
                'hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-bold transition',
                chatActive && 'bg-muted text-highlight',
            )}
        >
            Chat
            {unreadMessages > 0 && (
                <span
                    data-testid="chat-badge"
                    className="bg-accent text-accent-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                >
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
            )}
        </Link>
    );

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col">
            <header className="border-border bg-nav border-b">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-6 sm:px-8">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-x-6">
                        <Link
                            href={routes.home}
                            className="flex items-center gap-2.5"
                        >
                            <LogoMark className="size-9" />
                            <span className="font-display text-xl font-semibold">
                                {rest.site.shortName}
                            </span>
                            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase">
                                Back office
                            </span>
                        </Link>
                        <nav aria-label="Back office" className="-mx-1 flex max-w-full gap-1 overflow-x-auto whitespace-nowrap px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0">
                            {link(
                                '/dashboard',
                                'Dashboard',
                                url.startsWith('/dashboard'),
                            )}
                            {link(
                                routes.adminBlogs,
                                'Blogs',
                                url.startsWith(routes.adminBlogs),
                            )}
                            {link(
                                '/admin/campaigns',
                                'Campaigns',
                                url.startsWith('/admin/campaigns'),
                            )}
                            {chatLink}
                            {auth.user.role === 'admin' &&
                                link(
                                    routes.adminUsers,
                                    'Users',
                                    url.startsWith(routes.adminUsers),
                                )}
                        </nav>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:flex-nowrap sm:justify-end sm:gap-3">
                        <span className="min-w-0 truncate sm:max-w-none">
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
                            className="border-border hover:bg-muted rounded-lg border px-3 py-2 font-bold whitespace-nowrap transition sm:px-4"
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
