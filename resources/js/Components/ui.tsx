import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { cn } from '@/lib/utils';

export function Container({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto w-full max-w-7xl px-5 sm:px-8', className)}>{children}</div>;
}

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
    return (
        <p
            className={cn(
                'text-xs font-semibold uppercase tracking-[0.18em]',
                light ? 'text-accent' : 'text-lake',
            )}
        >
            {children}
        </p>
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
    title: string;
    lede?: string;
    light?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('max-w-3xl', className)}>
            {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.75rem]">{title}</h2>
            {lede && (
                <p className={cn('mt-4 text-lg', light ? 'text-band-muted' : 'text-muted-foreground')}>{lede}</p>
            )}
        </div>
    );
}

/** The gold "coin" icon used on pillars and values, echoing the template site. */
export function Coin({ name, className }: { name: string; className?: string }) {
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

type Variant = 'accent' | 'primary' | 'outline' | 'outline-light';

const variants: Record<Variant, string> = {
    accent: 'bg-accent text-accent-foreground hover:brightness-95',
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border-2 border-foreground/70 text-foreground hover:bg-foreground hover:text-background',
    'outline-light': 'border-2 border-white/70 text-white hover:bg-white hover:text-[#0c2d42]',
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
        'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition',
        variants[variant],
        className,
    );

    const content = (
        <>
            {children}
            {arrow && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
        </>
    );

    if (href.startsWith('/')) {
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

/** Inner page banner. Optional photo sits behind a navy wash. */
export function PageHero({
    eyebrow,
    title,
    lede,
    image,
    crumbs,
}: {
    eyebrow?: string;
    title: string;
    lede?: string;
    image?: string;
    crumbs?: Array<{ label: string; href?: string }>;
}) {
    return (
        <section className="relative isolate overflow-hidden bg-band text-band-foreground">
            {image && (
                <>
                    <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
                    <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#071a26] via-[#071a26]/85 to-[#071a26]/40" />
                </>
            )}
            {!image && (
                <div
                    aria-hidden="true"
                    className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-lake/20 blur-3xl"
                />
            )}
            <Container className="py-16 sm:py-24">
                {crumbs && (
                    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-band-muted">
                        <ol className="flex flex-wrap items-center gap-2">
                            {crumbs.map((crumb, index) => (
                                <li key={crumb.label} className="flex items-center gap-2">
                                    {index > 0 && <span aria-hidden="true">/</span>}
                                    {crumb.href ? (
                                        <Link href={crumb.href} className="hover:text-white hover:underline">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span aria-current="page">{crumb.label}</span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                <div className="max-w-3xl">
                    {eyebrow && <Eyebrow light>{eyebrow}</Eyebrow>}
                    <h1 className="mt-3 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">{title}</h1>
                    {lede && <p className="mt-5 text-lg text-band-muted sm:text-xl">{lede}</p>}
                </div>
            </Container>
        </section>
    );
}
