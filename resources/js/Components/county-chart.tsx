import { Reveal } from '@/components/reveal';
import type { County } from '@/types';

/** Share of Lake Victoria's Kenyan shoreline surface held by each focus county. */
export function CountyChart({ counties }: { counties: County[] }) {
    const max = Math.max(...counties.map((county) => county.share));

    return (
        <Reveal>
            <figure>
                <figcaption className="mb-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Surface share of Lake Victoria (Kenya) by county
                </figcaption>
                <ul className="space-y-4">
                    {counties.map((county, index) => (
                        <li key={county.name}>
                            <div className="mb-1.5 flex items-baseline justify-between text-sm">
                                <span className="font-semibold">{county.name}</span>
                                <span className="font-display text-lg font-semibold">{county.share}%</span>
                            </div>
                            <div
                                className="h-3.5 overflow-hidden rounded-full bg-muted"
                                role="img"
                                aria-label={`${county.name} holds ${county.share} percent`}
                            >
                                <div
                                    className="bar-fill h-full rounded-full bg-linear-to-r from-lake to-accent"
                                    style={{
                                        width: `${(county.share / max) * 100}%`,
                                        transitionDelay: `${index * 120}ms`,
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </figure>
        </Reveal>
    );
}
