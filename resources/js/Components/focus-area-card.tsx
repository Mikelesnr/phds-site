import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { Coin } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { FocusAreaCard } from '@/types';

export function FocusAreaCardView({ area }: { area: FocusAreaCard }) {
    return (
        <Link
            href={routes.focusArea(area.slug)}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
        >
            <div className="relative">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                        src={area.image}
                        alt={`Field photograph for ${area.title}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                </div>
                <Coin name={area.icon} className="absolute bottom-0 left-5 z-10 translate-y-1/2" />
            </div>
            <div className="flex flex-1 flex-col px-6 pb-6 pt-10">
                <h3 className="text-2xl font-semibold">{area.title}</h3>
                <p className="mt-1 text-sm font-medium text-lake">{area.hook}</p>
                <p className="mt-3 flex-1 text-muted-foreground">{area.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                    Explore this area
                    <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
            </div>
        </Link>
    );
}
