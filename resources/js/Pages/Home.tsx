import { Head, Link } from '@inertiajs/react';
import { BlogGrid } from '@/Components/blog-grid';
import { CountyChart } from '@/Components/county-chart';
import { Reveal } from '@/Components/reveal';
import {
    ButtonLink,
    Container,
    Eyebrow,
    Hl,
    RingIcon,
    SectionHeading,
} from '@/Components/ui';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type {
    Basin,
    BlogPost,
    County,
    FieldStory,
    FocusAreaCard,
    Pillar,
    Stat,
} from '@/types';

type Props = {
    stats: Stat[];
    quote: string;
    mission: string;
    pillars: Pillar[];
    fieldStory: FieldStory;
    counties: County[];
    basin: Basin;
    focusAreas: FocusAreaCard[];
    featuredBlogs: BlogPost[];
};

type FeatureItem = { icon: string; title: string; body: string; href?: string };

type Feature = {
    heading: string;
    cardClass: string;
    quote: string;
    byline: string;
    avatar: string;
    items: FeatureItem[];
};

function StatTile({
    stat,
    image,
    className,
}: {
    stat: Stat;
    image: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative isolate flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[2rem] p-8 text-center text-white',
                className,
            )}
        >
            <img
                src={image}
                alt=""
                loading="lazy"
                className="absolute inset-0 -z-20 size-full object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-black/50" />
            <div>
                <p className="font-display text-6xl font-medium leading-none sm:text-7xl">
                    {stat.value}
                </p>
                <p className="mt-3 font-display text-2xl font-medium sm:text-3xl">
                    {stat.label}
                </p>
                <p className="mx-auto mt-3 max-w-xs text-sm text-white/80">
                    {stat.note}
                </p>
            </div>
        </div>
    );
}

export default function Home({
    stats,
    quote,
    mission,
    pillars,
    fieldStory,
    counties,
    basin,
    focusAreas,
    featuredBlogs,
}: Props) {
    const area = (slug: string): FeatureItem => {
        const found = focusAreas.find((item) => item.slug === slug)!;
        return {
            icon: found.icon,
            title: found.title,
            body: found.summary,
            href: routes.focusArea(slug),
        };
    };
    const pillar = (title: string): FeatureItem => {
        const found = pillars.find((item) => item.title === title)!;
        return { icon: found.icon, title: found.title, body: found.body };
    };

    const features: Feature[] = [
        {
            heading: 'Healthy waters, land and climate.',
            cardClass: 'bg-forest',
            quote: mission,
            byline: 'PHDS mission',
            avatar: '/images/beach-landing.jpg',
            items: [
                area('blue-economy'),
                area('climate-change'),
                area('green-economy'),
            ],
        },
        {
            heading: 'Healthy people and animals.',
            cardClass: 'bg-lagoon',
            quote: fieldStory.lesson,
            byline: fieldStory.label,
            avatar: '/images/health-outreach.jpg',
            items: [
                area('global-health'),
                area('one-health'),
                pillar('Community participation'),
            ],
        },
        {
            heading: 'Evidence, innovation and capacity.',
            cardClass: 'bg-band',
            quote,
            byline: 'Our approach',
            avatar: '/images/shared-shoreline.jpg',
            items: [
                area('research-and-policy'),
                pillar('Technology and innovation'),
                pillar('Interdisciplinary action'),
            ],
        },
    ];

    return (
        <>
            <Head>
                <title>Planetary Health and Development Stewards</title>
                <meta name="description" content={mission} />
            </Head>

            {/* Hero: dark green panel beside a photograph */}
            <section className="grid bg-band text-band-foreground lg:min-h-[36rem] lg:grid-cols-2">
                <div className="flex items-center px-5 py-16 sm:px-12 lg:px-16 lg:py-24">
                    <div className="max-w-xl">
                        <h1 className="text-6xl font-medium leading-[0.98] sm:text-7xl lg:text-[5.25rem]">
                            A <Hl light>thriving planet</Hl> for humans and all
                            life forms.
                        </h1>
                        <p className="mt-8 max-w-md text-xl">
                            We work with communities around Lake Victoria to
                            restore ecosystems, protect health and secure
                            livelihoods.
                        </p>
                        <div className="mt-10">
                            <ButtonLink
                                href={routes.getInvolved}
                                variant="accent"
                                className="px-8 py-4 text-lg"
                            >
                                Partner With Us
                            </ButtonLink>
                        </div>
                    </div>
                </div>
                <div className="relative min-h-[20rem]">
                    <img
                        src="/images/landing-site.jpg"
                        alt="Fishing boats lined up along the shore at Sori on Lake Victoria"
                        fetchPriority="high"
                        className="absolute inset-0 size-full object-cover"
                    />
                </div>
            </section>

            {/* Intro */}
            <section className="py-20 sm:py-28">
                <Container className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <Eyebrow>
                            {stats[1]?.value} million people live in our five
                            focus counties
                        </Eyebrow>
                    </div>
                    <Reveal className="lg:col-span-8">
                        <h2 className="text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
                            <Hl>Regenerative solutions</Hl> for the health of
                            the planet, communities and ecosystems.
                        </h2>
                        <div className="mt-10 max-w-2xl space-y-6 text-lg text-muted-foreground">
                            <p>
                                PHDS works with communities on the shore of
                                Lake Victoria, where climate change,
                                biodiversity loss, disease and poverty arrive
                                together.
                            </p>
                            <p>
                                Through interdisciplinary, multisectoral and
                                evidence-based action, we help communities
                                become partners in restoring the systems they
                                depend on.
                            </p>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* Numbers */}
            <section className="pb-20 sm:pb-28">
                <Container className="grid gap-6 lg:grid-cols-3">
                    <Reveal className="lg:col-span-2">
                        <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] bg-accent p-10 text-center text-accent-foreground">
                            <p className="max-w-xl font-display text-3xl font-medium leading-snug sm:text-4xl">
                                PHDS works across {stats[0]?.value} Lake Victoria
                                counties in Kenya.
                            </p>
                        </div>
                    </Reveal>
                    {stats[1] && (
                        <Reveal delay={100}>
                            <StatTile
                                stat={stats[1]}
                                image="/images/beach-landing.jpg"
                                className="h-full"
                            />
                        </Reveal>
                    )}
                    {stats[2] && (
                        <Reveal>
                            <StatTile
                                stat={stats[2]}
                                image="/images/cage-farming.jpg"
                                className="h-full"
                            />
                        </Reveal>
                    )}
                    {stats[3] && (
                        <Reveal className="lg:col-span-2" delay={100}>
                            <StatTile
                                stat={stats[3]}
                                image="/images/shared-shoreline.jpg"
                                className="h-full"
                            />
                        </Reveal>
                    )}
                </Container>
            </section>

            {/* The difference */}
            <section className="bg-ink text-white">
                <div className="relative h-72 sm:h-96">
                    <img
                        src="/images/market-storks.jpg"
                        alt="People and marabou storks sharing a lakeside market"
                        loading="lazy"
                        className="size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <Container className="relative z-10 pb-20 sm:pb-28">
                    <Reveal>
                        <div className="-mt-24 rounded-[2rem] bg-accent p-8 text-accent-foreground shadow-2xl sm:-mt-32 sm:p-12">
                            <h2 className="text-4xl font-medium leading-tight sm:text-6xl">
                                The difference is stewardship.
                            </h2>
                            <div className="mt-8 grid gap-8 text-lg md:grid-cols-2 md:gap-12">
                                <p>
                                    <strong>
                                        Poverty, disease and environmental
                                        decline share the same roots:
                                    </strong>{' '}
                                    unsustainable use of natural resources,
                                    policy gaps, communities left out of
                                    decisions, and too little financing.
                                </p>
                                <div>
                                    <p>
                                        PHDS takes planetary health stewardship
                                        as a unifying approach. We bring health,
                                        environment, economy and policy
                                        together, with local communities in the
                                        lead.
                                    </p>
                                    <div className="mt-8">
                                        <ButtonLink
                                            href={routes.about}
                                            variant="dark"
                                        >
                                            Read Our Story
                                        </ButtonLink>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* Three feature blocks */}
            <section className="bg-ink pb-20 text-white sm:pb-28">
                <Container className="space-y-20 sm:space-y-28">
                    {features.map((feature) => (
                        <Reveal key={feature.heading}>
                            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,34rem)_1fr] lg:gap-20">
                                <div
                                    className={cn(
                                        'flex flex-col justify-between gap-12 rounded-[2rem] p-8 sm:p-10 lg:min-h-[34rem]',
                                        feature.cardClass,
                                    )}
                                >
                                    <h2 className="text-5xl font-medium leading-[1.02] sm:text-6xl">
                                        {feature.heading}
                                    </h2>
                                    <figure>
                                        <blockquote className="text-lg italic leading-relaxed">
                                            &ldquo;{feature.quote}&rdquo;
                                        </blockquote>
                                        <figcaption className="mt-6 flex items-center gap-3">
                                            <img
                                                src={feature.avatar}
                                                alt=""
                                                loading="lazy"
                                                className="size-12 rounded-full object-cover"
                                            />
                                            <span>{feature.byline}</span>
                                        </figcaption>
                                    </figure>
                                </div>
                                <ul className="space-y-10">
                                    {feature.items.map((item) => (
                                        <li
                                            key={item.title}
                                            className="flex items-start gap-4"
                                        >
                                            <RingIcon name={item.icon} />
                                            <div>
                                                <h3 className="font-sans text-2xl font-bold">
                                                    {item.href ? (
                                                        <Link
                                                            href={item.href}
                                                            className="hover:text-lime"
                                                        >
                                                            {item.title}
                                                        </Link>
                                                    ) : (
                                                        item.title
                                                    )}
                                                </h3>
                                                <p className="mt-2 text-lg text-white/65">
                                                    {item.body}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Reveal>
                    ))}
                </Container>
            </section>

            {/* Featured blog posts */}
            {featuredBlogs.length > 0 && (
                <section className="py-20 sm:py-28">
                    <Container>
                        <Reveal className="flex flex-wrap items-end justify-between gap-6">
                            <SectionHeading
                                eyebrow="Featured stories"
                                title={
                                    <>
                                        News from the <Hl>lakeshore</Hl>.
                                    </>
                                }
                            />
                            <ButtonLink
                                href={routes.blogs}
                                variant="primary"
                                arrow
                            >
                                View All Blogs
                            </ButtonLink>
                        </Reveal>
                        <div className="mt-12">
                            <BlogGrid posts={featuredBlogs} />
                        </div>
                    </Container>
                </section>
            )}

            {/* Where we work */}
            <section className="py-20 sm:py-28">
                <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                    <Reveal>
                        <Eyebrow>Where we work</Eyebrow>
                        <h2 className="mt-3 text-4xl font-medium leading-[1.05] sm:text-5xl">
                            Five counties on the shore of{' '}
                            <Hl>Lake Victoria</Hl>.
                        </h2>
                        <p className="mt-6 text-lg text-muted-foreground">
                            {basin.summary}
                        </p>
                        <p className="mt-4 text-muted-foreground">
                            The basin is shared by {basin.countries}.
                        </p>
                        <div className="mt-8">
                            <ButtonLink
                                href={routes.whereWeWork}
                                variant="primary"
                                arrow
                            >
                                See The Focus Counties
                            </ButtonLink>
                        </div>
                    </Reveal>
                    <CountyChart counties={counties} />
                </Container>
            </section>

            {/* Ready to partner */}
            <section className="bg-ink py-16 text-white sm:py-24">
                <Container className="grid gap-6 lg:grid-cols-2">
                    <Reveal>
                        <div className="flex h-full flex-col items-start justify-between gap-10 rounded-[2rem] bg-black/60 p-8 sm:p-12">
                            <div>
                                <h2 className="text-5xl font-medium leading-tight sm:text-6xl">
                                    Ready to partner?
                                </h2>
                                <p className="mt-6 max-w-md text-xl">
                                    Together we can restore the systems that
                                    people and wildlife on Lake Victoria depend
                                    on.
                                </p>
                            </div>
                            <ButtonLink
                                href={routes.getInvolved}
                                variant="accent"
                            >
                                Start A Conversation
                            </ButtonLink>
                        </div>
                    </Reveal>
                    <Reveal delay={100}>
                        <div className="flex h-full flex-col items-start justify-between gap-10 rounded-[2rem] bg-lagoon p-8 sm:p-12">
                            <div>
                                <h2 className="text-4xl font-medium leading-tight sm:text-5xl">
                                    {stats[1]?.value} people live in our five
                                    focus counties.
                                </h2>
                                <p className="mt-6 max-w-md text-lg text-white/80">
                                    See how the lakeshore counties share one
                                    lake, one catchment and one future.
                                </p>
                            </div>
                            <ButtonLink
                                href={routes.whereWeWork}
                                variant="dark"
                            >
                                See Where We Work
                            </ButtonLink>
                        </div>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
