import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/Components/icon';
import { cn } from '@/lib/utils';

export function Container({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('mx-auto w-full max-w-7xl px-5 sm:px-8', className)}>
            {children}
        </div>
    );
}

export function Eyebrow({
    children,
    light,
}: {
    children: ReactNode;
    light?: boolean;
}) {
    return (
        <p
            className={cn(
                'text-sm font-semibold uppercase tracking-[0.14em]',
                light ? 'text-lime' : 'text-highlight',
            )}
        >
            {children}
        </p>
    );
}

/** Highlighted word inside a headline, like "empower" on the template site. */
export function Hl({
    children,
    light,
}: {
    children: ReactNode;
    light?: boolean;
}) {
    return (
        <span className={light ? 'text-lime' : 'text-highlight'}>{children}</span>
    );
}

export function SectionHeading({
    eyebrow,
    title,
    lede,
    light,
    className,
}: {
    eyebrow?: string;
    title: ReactNode;
    lede?: string;
    light?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('max-w-3xl', className)}>
            {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
            <h2 className="mt-3 text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
                {title}
            </h2>
            {lede && (
                <p
                    className={cn(
                        'mt-5 text-lg',
                        light ? 'text-band-muted' : 'text-muted-foreground',
                    )}
                >
                    {lede}
                </p>
            )}
        </div>
    );
}

/** Lime icon badge used on pillars and values. */
export function Coin({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm ring-4 ring-accent/25',
                className,
            )}
        >
            <Icon name={name} className="size-6" />
        </span>
    );
}

/** Outline icon badge used on feature lists, like the template's star badges. */
export function RingIcon({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-lime text-lime',
                className,
            )}
        >
            <Icon name={name} className="size-5" />
        </span>
    );
}

type Variant = 'accent' | 'primary' | 'dark' | 'outline' | 'outline-light';

const variants: Record<Variant, string> = {
    accent: 'bg-accent text-accent-foreground hover:brightness-110',
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    dark: 'bg-ink text-white hover:bg-black',
    outline:
        'border-2 border-foreground/70 text-foreground hover:bg-foreground hover:text-background',
    'outline-light':
        'border-2 border-white/70 text-white hover:bg-white hover:text-ink',
};

export function ButtonLink({
    href,
    children,
    variant = 'accent',
    arrow,
    className,
}: {
    href: string;
    children: ReactNode;
    variant?: Variant;
    arrow?: boolean;
    className?: string;
}) {
    const classes = cn(
        'group inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-bold transition',
        variants[variant],
        className,
    );

    const content = (
        <>
            {children}
            {arrow && (
                <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                />
            )}
        </>
    );

    if (href.startsWith('/') && !href.includes('#')) {
        return (
            <Link href={href} className={classes}>
                {content}
            </Link>
        );
    }

    return (
        <a href={href} className={classes}>
            {content}
        </a>
    );
}

/** Inner page banner. Optional photo sits behind a forest green wash. */
export function PageHero({
    eyebrow,
    title,
    lede,
    image,
    crumbs,
}: {
    eyebrow?: string;
    title: ReactNode;
    lede?: string;
    image?: string;
    crumbs?: Array<{ label: string; href?: string }>;
}) {
    return (
        <section className="relative isolate overflow-hidden bg-band text-band-foreground">
            {image && (
                <>
                    <img
                        src={image}
                        alt=""
                        className="absolute inset-0 -z-20 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 -z-10 bg-linear-to-r from-band via-band/90 to-band/50" />
                </>
            )}
            <Container className="py-16 sm:py-24">
                {crumbs && (
                    <nav
                        aria-label="Breadcrumb"
                        className="mb-6 text-sm text-band-muted"
                    >
                        <ol className="flex flex-wrap items-center gap-2">
                            {crumbs.map((crumb, index) => (
                                <li
                                    key={crumb.label}
                                    className="flex items-center gap-2"
                                >
                                    {index > 0 && <span aria-hidden="true">/</span>}
                                    {crumb.href ? (
                                        <Link
                                            href={crumb.href}
                                            className="hover:text-white hover:underline"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span aria-current="page">
                                            {crumb.label}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                <div className="max-w-3xl">
                    {eyebrow && <Eyebrow light>{eyebrow}</Eyebrow>}
                    <h1 className="mt-3 text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
                        {title}
                    </h1>
                    {lede && (
                        <p className="mt-6 text-lg text-band-muted sm:text-xl">
                            {lede}
                        </p>
                    )}
                </div>
            </Container>
        </section>
    );
}
