import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { PageLink } from '@/types';

/** Laravel sends labels like "&laquo; Previous". Strip the entities, keep the words. */
function cleanLabel(label: string): string {
    return label.replace(/&laquo;|&raquo;|«|»/g, '').trim();
}

/** Renders the links from Laravel's built-in paginator. */
export function Pagination({ links }: { links: PageLink[] }) {
    // Previous, Next and a single page number means there is nothing to page through.
    if (links.length <= 3) return null;

    return (
        <nav
            aria-label="Pagination"
            className="mt-12 flex flex-wrap items-center justify-center gap-2"
        >
            {links.map((link, index) => {
                const label = cleanLabel(link.label);
                const base =
                    'inline-flex min-w-11 items-center justify-center rounded-lg border px-4 py-2.5 text-base font-bold transition';

                if (!link.url) {
                    return (
                        <span
                            key={`${label}-${index}`}
                            aria-disabled="true"
                            className={cn(
                                base,
                                'cursor-not-allowed border-border text-muted-foreground opacity-50',
                            )}
                        >
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={`${label}-${index}`}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={cn(
                            base,
                            link.active
                                ? 'border-accent bg-accent text-accent-foreground'
                                : 'border-border hover:bg-muted',
                        )}
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
