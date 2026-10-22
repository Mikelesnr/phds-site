import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ButtonLink, Container } from '@/components/ui';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

function useIsActive() {
    const { url } = usePage();
    const path = url.split('?')[0] ?? '/';
    return (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
    const isActive = useIsActive();
    return (
        <Link
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition hover:bg-muted',
                isActive(href) ? 'text-lake' : 'text-foreground',
            )}
        >
            {children}
        </Link>
    );
}

function Dropdown({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const wrapper = useRef<HTMLDivElement>(null);
    const hoverOpened = useRef(false);
    const panelId = useId();

    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hoverOpened.current = false;
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div
            ref={wrapper}
            className="relative"
            onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return;
                hoverOpened.current = true;
                setOpen(true);
            }}
            onPointerLeave={(event) => {
                if (event.pointerType !== 'mouse') return;
                hoverOpened.current = false;
                setOpen(false);
            }}
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => {
                    // A mouse click on an already hover-opened menu should not close it.
                    if (hoverOpened.current) return;
                    setOpen((value) => !value);
                }}
                className={cn(
                    'inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-muted',
                    active ? 'text-lake' : 'text-foreground',
                )}
            >
                {label}
                <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && (
                <div id={panelId} className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
                    <div className="rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-2xl">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuItem({ href, title, hint, icon }: { href: string; title: string; hint?: string; icon?: string }) {
    return (
        <Link href={href} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-muted">
            {icon && (
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Icon name={icon} className="size-4" />
                </span>
            )}
            <span>
                <span className="block text-sm font-semibold">{title}</span>
                {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
            </span>
        </Link>
    );
}

export function SiteHeader() {
    const { props } = usePage<SharedProps>();
    const isActive = useIsActive();
    const [mobileOpen, setMobileOpen] = useState(false);
    const focusAreas = props.nav.focusAreas;

    useEffect(() => router.on('navigate', () => setMobileOpen(false)), []);

    const aboutActive = isActive(routes.about) || isActive(routes.whereWeWork);
    const workActive = isActive(routes.whatWeDo) || isActive('/focus-areas');

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
            <Container className="flex h-[4.5rem] items-center justify-between gap-4">
                <Link href={routes.home} className="flex items-center gap-3" aria-label={`${props.site.shortName}, home`}>
                    <LogoMark />
                    <span className="leading-tight">
                        <span className="block font-display text-xl font-semibold tracking-tight">
                            {props.site.shortName}
                        </span>
                        <span className="hidden text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground sm:block">
                            Planetary Health &amp; Development Stewards
                        </span>
                    </span>
                </Link>

                <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
                    <Dropdown label="About" active={aboutActive}>
                        <div className="w-80">
                            <MenuItem href={routes.about} title="Our story" hint="Why PHDS exists and what we stand for" />
                            <MenuItem href={routes.board} title="Board" hint="The people who govern PHDS" />
                            <MenuItem href={routes.whereWeWork} title="Where we work" hint="Five counties on Lake Victoria" />
                        </div>
                    </Dropdown>

                    <Dropdown label="What we do" active={workActive}>
                        <div className="w-[34rem]">
                            <MenuItem href={routes.whatWeDo} title="Overview" hint="Objectives, pillars and focus areas" />
                            <div className="my-2 border-t border-border" />
                            <div className="grid grid-cols-2 gap-1">
                                {focusAreas.map((area) => (
                                    <MenuItem
                                        key={area.slug}
                                        href={routes.focusArea(area.slug)}
                                        title={area.title}
                                        icon={area.icon}
                                    />
                                ))}
                            </div>
                        </div>
                    </Dropdown>

                    <NavLink href={routes.whereWeWork}>Where we work</NavLink>
                    <NavLink href={routes.getInvolved}>Get involved</NavLink>
                    <NavLink href={routes.contact}>Contact</NavLink>
                </nav>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <ButtonLink href={routes.getInvolved} variant="accent" className="hidden px-5 py-2.5 sm:inline-flex">
                        Partner with us
                    </ButtonLink>
                    <button
                        type="button"
                        className="inline-flex size-10 items-center justify-center rounded-full border border-border lg:hidden"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        onClick={() => setMobileOpen((value) => !value)}
                    >
                        {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                    </button>
                </div>
            </Container>

            {mobileOpen && (
                <nav
                    id="mobile-menu"
                    aria-label="Mobile"
                    className="max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-border bg-background lg:hidden"
                >
                    <Container className="space-y-6 py-6">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">About</p>
                            <ul className="space-y-1">
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.about}>Our story</Link></li>
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.board}>Board</Link></li>
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.whereWeWork}>Where we work</Link></li>
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">What we do</p>
                            <ul className="space-y-1">
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.whatWeDo}>Overview</Link></li>
                                {focusAreas.map((area) => (
                                    <li key={area.slug}>
                                        <Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.focusArea(area.slug)}>
                                            {area.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Get involved</p>
                            <ul className="space-y-1">
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.getInvolved}>Partner with us</Link></li>
                                <li><Link className="block rounded-lg px-3 py-2 font-medium hover:bg-muted" href={routes.contact}>Contact</Link></li>
                            </ul>
                        </div>
                    </Container>
                </nav>
            )}
        </header>
    );
}
