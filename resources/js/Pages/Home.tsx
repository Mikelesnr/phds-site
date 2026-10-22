import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { CountyChart } from '@/components/county-chart';
import { FocusAreaCardView } from '@/components/focus-area-card';
import { Reveal } from '@/components/reveal';
import { ButtonLink, Coin, Container, Eyebrow, SectionHeading } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { Basin, County, FieldStory, FocusAreaCard, Pillar, Stat } from '@/types';

type Props = {
    stats: Stat[];
    quote: string;
    mission: string;
    pillars: Pillar[];
    fieldStory: FieldStory;
    counties: County[];
    basin: Basin;
    focusAreas: FocusAreaCard[];
};

export default function Home({ stats, quote, mission, pillars, fieldStory, counties, basin, focusAreas }: Props) {
    return (
        <>
            <Head>
                <title>Planetary Health and Development Stewards</title>
                <meta name="description" content={mission} />
            </Head>

            {/* Hero */}
            <section className="relative isolate overflow-hidden bg-band text-band-foreground">
                <img
                    src="/images/landing-site.jpg"
                    alt=""
                    fetchPriority="high"
                    className="absolute inset-0 -z-20 h-full w-full object-cover"
                />
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#071a26] via-[#071a26]/80 to-[#071a26]/20" />
                <Container className="py-24 sm:py-32 lg:py-44">
                    <div className="max-w-2xl">
                        <Eyebrow light>Lake Victoria Basin, Kenya</Eyebrow>
                        <h1 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
                            A thriving planet for humans and all life forms.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg text-band-muted sm:text-xl">
                            We work with communities around Lake Victoria to restore ecosystems, protect health and
                            secure livelihoods, through interdisciplinary and evidence-based action.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-3">
                            <ButtonLink href={routes.getInvolved} variant="accent" arrow>
                                Partner with us
                            </ButtonLink>
                            <ButtonLink href={routes.whatWeDo} variant="outline-light">
                                Explore our work
                            </ButtonLink>
                        </div>
                    </div>
                </Container>
            </section>

            <div className="bg-accent text-accent-foreground">
                <Container className="flex flex-col gap-1 py-3 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
                    <p>A Public Benefit Organization registered in Kenya, working across five Lake Victoria counties.</p>
                    <Link href={routes.whereWeWork} className="inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline">
                        Where we work <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </Container>
            </div>

            {/* Stats */}
            <section className="bg-band text-band-foreground" aria-label="PHDS at a glance">
                <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, index) => (
                        <Reveal key={stat.label} delay={index * 100}>
                            <div className="border-l-2 border-accent pl-5">
                                <p className="font-display text-5xl font-semibold text-accent">{stat.value}</p>
                                <h2 className="mt-2 font-sans text-base font-semibold">{stat.label}</h2>
                                <p className="mt-1 text-sm text-band-muted">{stat.note}</p>
                            </div>
                        </Reveal>
                    ))}
                </Container>
            </section>

            {/* The difference */}
            <section className="py-20 sm:py-28">
                <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    <Reveal>
                        <Eyebrow>Why stewardship</Eyebrow>
                        <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
                            The difference is stewardship.
                        </h2>
                        <p className="mt-6 text-lg text-muted-foreground">
                            Poverty, disease and environmental decline share the same roots: unsustainable use of
                            natural resources, policy gaps, communities left out of decisions, and too little
                            financing. Treating them one at a time has not worked.
                        </p>
                        <p className="mt-4 text-lg text-muted-foreground">
                            PHDS takes planetary health stewardship as a unifying approach. We bring health,
                            environment, economy and policy together, with local communities in the lead.
                        </p>
                        <div className="mt-8">
                            <ButtonLink href={routes.about} variant="primary" arrow>
                                Read our story
                            </ButtonLink>
                        </div>
                    </Reveal>
                    <Reveal delay={150}>
                        <div className="relative">
                            <img
                                src="/images/beach-landing.jpg"
                                alt="Fishers and boats on the shore of Lake Victoria"
                                loading="lazy"
                                className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
                            />
                            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl bg-accent p-5 text-accent-foreground shadow-xl sm:block">
                                <p className="font-display text-lg font-semibold leading-snug">Lake Victoria Basin</p>
                                <p className="mt-1 max-w-[16rem] text-sm font-medium">
                                    Five lakeshore counties in Kenya, one shared lake.
                                </p>
                            </div>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* Focus areas */}
            <section className="bg-muted py-20 sm:py-28">
                <Container>
                    <Reveal>
                        <SectionHeading
                            eyebrow="Focus areas"
                            title="Six areas where health, environment and livelihoods meet."
                            lede="Each one starts with what communities on the lakeshore are living through today."
                        />
                    </Reveal>
                    <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {focusAreas.map((area, index) => (
                            <Reveal key={area.slug} delay={(index % 3) * 100}>
                                <FocusAreaCardView area={area} />
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Pillars with quote */}
            <section className="bg-band py-20 text-band-foreground sm:py-28">
                <Container>
                    <Reveal>
                        <blockquote className="mx-auto max-w-4xl text-center">
                            <p className="font-display text-2xl font-medium leading-snug sm:text-4xl">
                                &ldquo;{quote}&rdquo;
                            </p>
                            <footer className="mt-6 text-sm font-semibold uppercase tracking-widest text-accent">
                                Our approach
                            </footer>
                        </blockquote>
                    </Reveal>
                    <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {pillars.map((pillar, index) => (
                            <Reveal key={pillar.title} delay={index * 100}>
                                <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-6">
                                    <Coin name={pillar.icon} />
                                    <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                                    <p className="mt-2 text-sm text-band-muted">{pillar.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Field story */}
            <section className="py-20 sm:py-28">
                <Container className="grid items-center gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-2">
                        <img
                            src="/images/health-outreach.jpg"
                            alt="A community health promoter speaking with a woman during an outreach at Sori"
                            loading="lazy"
                            className="aspect-[4/5] w-full rounded-3xl object-cover shadow-xl"
                        />
                    </Reveal>
                    <Reveal className="lg:col-span-3" delay={120}>
                        <Eyebrow>{fieldStory.label}</Eyebrow>
                        <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                            She would go for screening if someone minded her stock.
                        </h2>
                        <p className="mt-6 text-lg text-muted-foreground">{fieldStory.body}</p>
                        <p className="mt-4 border-l-4 border-accent pl-5 text-lg font-medium">{fieldStory.lesson}</p>
                        <div className="mt-8">
                            <ButtonLink href={routes.focusArea('global-health')} variant="outline" arrow>
                                Read about global health
                            </ButtonLink>
                        </div>
                    </Reveal>
                </Container>
            </section>

            {/* Where we work */}
            <section className="bg-muted py-20 sm:py-28">
                <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                    <Reveal>
                        <Eyebrow>Where we work</Eyebrow>
                        <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                            Five counties on the shore of Lake Victoria.
                        </h2>
                        <p className="mt-5 text-lg text-muted-foreground">{basin.summary}</p>
                        <p className="mt-4 text-muted-foreground">
                            The basin is shared by {basin.countries}.
                        </p>
                        <div className="mt-8">
                            <ButtonLink href={routes.whereWeWork} variant="primary" arrow>
                                See the focus counties
                            </ButtonLink>
                        </div>
                    </Reveal>
                    <CountyChart counties={counties} />
                </Container>
            </section>

            {/* Partner CTA */}
            <section className="bg-accent py-20 text-accent-foreground sm:py-24">
                <Container className="text-center">
                    <Reveal>
                        <h2 className="mx-auto max-w-3xl text-3xl font-semibold sm:text-5xl">Ready to partner?</h2>
                        <p className="mx-auto mt-5 max-w-2xl text-lg font-medium">
                            Together we can restore the systems that people and wildlife on Lake Victoria depend on.
                        </p>
                        <div className="mt-9 flex flex-wrap justify-center gap-3">
                            <ButtonLink
                                href={routes.getInvolved}
                                variant="primary"
                                className="!bg-[#0c2d42] !text-[#fbf8f1]"
                                arrow
                            >
                                Start a conversation
                            </ButtonLink>
                            <ButtonLink href={routes.contact} variant="outline" className="!border-[#0c2d42] !text-[#0c2d42] hover:!bg-[#0c2d42] hover:!text-[#f4b63f]">
                                Contact us
                            </ButtonLink>
                        </div>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
