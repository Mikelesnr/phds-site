import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoMark } from '@/Components/logo';
import { ThemeToggle } from '@/Components/theme-toggle';
import { ButtonLink } from '@/Components/ui';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

type MenuItem = { title: string; hint: string; href: string };
type MenuGroup = { heading: string; items: MenuItem[] };
type MenuId = 'about' | 'work' | 'help';

const popularLinks: Array<{ title: string; href: string }> = [
    { title: 'How We Work', href: routes.whatWeDo },
    { title: 'Where We Work', href: routes.whereWeWork },
    { title: 'Start a Partnership', href: routes.getInvolved },
];

/** Menu content. Focus areas are filled in from shared props. */
function useMenus(): Record<MenuId, MenuGroup[]> {
    const { props } = usePage<SharedProps>();

    return {
        about: [
            {
                heading: 'Who we are',
                items: [
                    {
                        title: 'Our Story',
                        hint: 'How PHDS began in Lambwe Valley and what we stand for',
                        href: routes.about,
                    },
                    {
                        title: 'Board',
                        hint: 'Meet the people who govern PHDS',
                        href: routes.board,
                    },
                    {
                        title: 'Where We Work',
                        hint: 'Five counties on the shore of Lake Victoria',
                        href: routes.whereWeWork,
                    },
                ],
            },
            {
                heading: 'Accountability',
                items: [
                    {
                        title: 'Objectives & Values',
                        hint: 'What guides our work and what we set out to do',
                        href: `${routes.about}#values`,
                    },
                    {
                        title: 'Organisational Development',
                        hint: 'The policies, partnerships and plans now being put in place',
                        href: `${routes.about}#development`,
                    },
                ],
            },
        ],
        work: [
            {
                heading: 'Our approach',
                items: [
                    {
                        title: 'How We Work',
                        hint: 'Objectives, four pillars and six focus areas',
                        href: routes.whatWeDo,
                    },
                ],
            },
            {
                heading: 'Focus areas',
                items: props.nav.focusAreas.map((area) => ({
                    title: area.title,
                    hint: area.hook,
                    href: routes.focusArea(area.slug),
                })),
            },
        ],
        help: [
            {
                heading: 'Ways to help',
                items: [
                    {
                        title: 'Partner With Us',
                        hint: 'Fund the work, research together, share expertise or co-develop projects',
                        href: routes.getInvolved,
                    },
                    {
                        title: 'Contact Us',
                        hint: 'Questions, ideas or an invitation to collaborate',
                        href: routes.contact,
                    },
                ],
            },
        ],
    };
}

function MenuAnchor({
    href,
    className,
    children,
}: {
    href: string;
    className?: string;
    children: ReactNode;
}) {
    // Anchors to a section on the same or another page use a normal link.
    if (href.includes('#')) {
        return (
            <a href={href} className={className}>
                {children}
            </a>
        );
    }
    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}

function MegaPanel({ groups }: { groups: MenuGroup[] }) {
    return (
        <div className="absolute inset-x-0 top-full border-t border-border bg-nav text-foreground shadow-2xl">
            <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[1fr_22rem]">
                <div className="space-y-10 px-8 py-10 lg:px-14">
                    {groups.map((group) => (
                        <section key={group.heading}>
                            <h2 className="border-b border-border pb-4 font-sans text-sm font-bold uppercase tracking-wide text-highlight">
                                {group.heading}
                            </h2>
                            <ul className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
                                {group.items.map((item) => (
                                    <li key={item.title}>
                                        <MenuAnchor
                                            href={item.href}
                                            className="group block"
                                        >
                                            <span className="block text-lg font-bold group-hover:text-highlight">
                                                {item.title}
                                            </span>
                                            <span className="mt-1 block text-muted-foreground">
                                                {item.hint}
                                            </span>
                                        </MenuAnchor>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
                <aside className="bg-muted px-8 py-10">
                    <h2 className="font-sans text-sm font-bold uppercase tracking-wide text-muted-foreground">
                        Popular links
                    </h2>
                    <ul className="mt-5">
                        {popularLinks.map((link) => (
                            <li
                                key={link.title}
                                className="border-t border-border first:border-t-0 first:pt-0"
                            >
                                <Link
                                    href={link.href}
                                    className="flex items-center justify-between py-4 text-lg font-bold hover:text-highlight"
                                >
                                    {link.title}
                                    <ArrowUpRight
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </div>
    );
}

export function SiteHeader() {
    const { props, url } = usePage<SharedProps>();
    const menus = useMenus();
    const [open, setOpen] = useState<MenuId | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const hoverOpened = useRef(false);
    const header = useRef<HTMLElement>(null);
    const path = url.split('?')[0].split('#')[0];

    useEffect(
        () =>
            router.on('navigate', () => {
                setOpen(null);
                setMobileOpen(false);
            }),
        [],
    );

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (header.current && !header.current.contains(event.target as Node))
                setOpen(null);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hoverOpened.current = false;
                setOpen(null);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const isActive = (href: string) =>
        href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

    const items: Array<{ id?: MenuId; label: string; href: string; active: boolean }> = [
        {
            id: 'about',
            label: 'About Us',
            href: routes.about,
            active: isActive(routes.about),
        },
        {
            id: 'work',
            label: 'What We Do',
            href: routes.whatWeDo,
            active: isActive(routes.whatWeDo) || isActive('/focus-areas'),
        },
        {
            label: 'Where We Work',
            href: routes.whereWeWork,
            active: isActive(routes.whereWeWork),
        },
        {
            id: 'help',
            label: 'Get Involved',
            href: routes.getInvolved,
            active: isActive(routes.getInvolved) || isActive(routes.contact),
        },
    ];

    return (
        <header
            ref={header}
            className="sticky top-0 z-50 bg-nav text-foreground"
            onPointerLeave={(event) => {
                if (event.pointerType !== 'mouse') return;
                hoverOpened.current = false;
                setOpen(null);
            }}
        >
            <div className="mx-auto flex h-[4.75rem] max-w-[90rem] items-stretch justify-between gap-4 px-5 sm:px-8">
                <Link
                    href={routes.home}
                    className="flex items-center gap-3 self-center"
                    aria-label={`${props.site.shortName}, home`}
                >
                    <LogoMark className="size-11" />
                    <span className="leading-tight">
                        <span className="block font-display text-2xl font-semibold tracking-tight">
                            {props.site.shortName}
                        </span>
                        <span className="hidden text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground xl:block">
                            Planetary Health &amp; Development Stewards
                        </span>
                    </span>
                </Link>

                <nav aria-label="Main" className="hidden items-stretch lg:flex">
                    {items.map((item) => {
                        const isOpen = item.id !== undefined && open === item.id;
                        const underline = cn(
                            'pointer-events-none absolute inset-x-0.5 bottom-0 h-[3px] rounded-full transition-colors',
                            isOpen || item.active
                                ? 'bg-lime'
                                : 'bg-foreground/15',
                        );

                        return (
                            <div
                                key={item.label}
                                className="relative flex"
                                onPointerEnter={(event) => {
                                    if (event.pointerType !== 'mouse') return;
                                    hoverOpened.current = true;
                                    setOpen(item.id ?? null);
                                }}
                            >
                                {item.id ? (
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => {
                                            // A mouse click on a hover-opened menu keeps it open.
                                            if (hoverOpened.current) return;
                                            setOpen(isOpen ? null : item.id ?? null);
                                        }}
                                        className="flex items-center gap-1.5 px-4 text-[1.05rem] font-medium"
                                    >
                                        {item.label}
                                        <ChevronDown
                                            className={cn(
                                                'size-4 transition-transform',
                                                isOpen && 'rotate-180',
                                            )}
                                            aria-hidden="true"
                                        />
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        aria-current={item.active ? 'page' : undefined}
                                        className="flex items-center px-4 text-[1.05rem] font-medium"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                                <span className={underline} />
                            </div>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2 self-center">
                    <ThemeToggle />
                    <ButtonLink
                        href={routes.getInvolved}
                        variant="accent"
                        className="hidden px-5 py-2.5 sm:inline-flex"
                    >
                        Partner With Us
                    </ButtonLink>
                    <button
                        type="button"
                        className="inline-flex size-10 items-center justify-center rounded-full border border-border lg:hidden"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        onClick={() => setMobileOpen((value) => !value)}
                    >
                        {mobileOpen ? (
                            <X className="size-5" aria-hidden="true" />
                        ) : (
                            <Menu className="size-5" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {open && <MegaPanel groups={menus[open]} />}

            {mobileOpen && (
                <nav
                    id="mobile-menu"
                    aria-label="Mobile"
                    className="max-h-[calc(100vh-4.75rem)] overflow-y-auto border-t border-border bg-nav lg:hidden"
                >
                    <div className="space-y-1 px-5 py-4">
                        {(
                            [
                                ['about', 'About Us'],
                                ['work', 'What We Do'],
                                ['help', 'Get Involved'],
                            ] as Array<[MenuId, string]>
                        ).map(([id, label]) => (
                            <details
                                key={id}
                                className="group border-b border-border py-1"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-lg font-bold">
                                    {label}
                                    <ChevronDown
                                        className="size-5 transition-transform group-open:rotate-180"
                                        aria-hidden="true"
                                    />
                                </summary>
                                <div className="space-y-4 pb-4">
                                    {menus[id].map((group) => (
                                        <div key={group.heading}>
                                            <p className="text-xs font-bold uppercase tracking-wide text-highlight">
                                                {group.heading}
                                            </p>
                                            <ul className="mt-1">
                                                {group.items.map((item) => (
                                                    <li key={item.title}>
                                                        <MenuAnchor
                                                            href={item.href}
                                                            className="block rounded-lg px-2 py-2 font-medium hover:bg-muted"
                                                        >
                                                            {item.title}
                                                        </MenuAnchor>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        ))}
                        <Link
                            href={routes.whereWeWork}
                            className="block border-b border-border py-4 text-lg font-bold"
                        >
                            Where We Work
                        </Link>
                        <div className="pt-4">
                            <ButtonLink
                                href={routes.getInvolved}
                                variant="accent"
                                className="w-full"
                            >
                                Partner With Us
                            </ButtonLink>
                        </div>
                    </div>
                </nav>
            )}
        </header>
    );
}
