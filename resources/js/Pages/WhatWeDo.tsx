import { Head } from '@inertiajs/react';
import { FocusAreaCardView } from '@/Components/focus-area-card';
import { Reveal } from '@/Components/reveal';
import { ButtonLink, Coin, Container, PageHero, SectionHeading } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { FocusAreaCard, Pillar } from '@/types';

type Props = { objectives: string[]; pillars: Pillar[]; focusAreas: FocusAreaCard[] };

export default function WhatWeDo({ objectives, pillars, focusAreas }: Props) {
    return (
        <>
            <Head title="What we do">
                <meta name="description" content="PHDS objectives, conceptual framework and thematic areas." />
            </Head>

            <PageHero
                eyebrow="What we do"
                title="Interdisciplinary action for planetary health."
                lede="One framework, four pillars and six focus areas, all aimed at the same goal: regenerating the systems that people and all life depend on."
                image="/images/cage-farming.jpg"
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'What we do' }]}
            />

            <section className="py-20 sm:py-24">
                <Container>
                    <Reveal>
                        <SectionHeading eyebrow="Conceptual framework" title="Four pillars hold the work together." />
                    </Reveal>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {pillars.map((pillar, index) => (
                            <Reveal key={pillar.title} delay={index * 100}>
                                <div className="h-full rounded-3xl border border-border bg-card p-6">
                                    <Coin name={pillar.icon} />
                                    <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">{pillar.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="bg-band py-20 text-band-foreground sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-2">
                        <SectionHeading light eyebrow="Broad objectives" title="What we are working towards." />
                    </Reveal>
                    <Reveal className="lg:col-span-3" delay={120}>
                        <ol className="space-y-6">
                            {objectives.map((objective, index) => (
                                <li key={objective} className="flex gap-4 border-b border-white/10 pb-6 last:border-0 last:pb-0">
                                    <span className="font-display text-3xl font-semibold text-accent">{index + 1}</span>
                                    <span className="pt-1 text-lg">{objective}</span>
                                </li>
                            ))}
                        </ol>
                    </Reveal>
                </Container>
            </section>

            <section className="bg-muted py-20 sm:py-24">
                <Container>
                    <Reveal>
                        <SectionHeading eyebrow="Thematic areas" title="Where we focus." />
                    </Reveal>
                    <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {focusAreas.map((area, index) => (
                            <Reveal key={area.slug} delay={(index % 3) * 100}>
                                <FocusAreaCardView area={area} />
                            </Reveal>
                        ))}
                    </div>
                    <div className="mt-14 text-center">
                        <ButtonLink href={routes.getInvolved} variant="primary" arrow>
                            Partner with us
                        </ButtonLink>
                    </div>
                </Container>
            </section>
        </>
    );
}
