import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { ContactForm } from '@/components/contact-form';
import { Icon } from '@/components/icon';
import { Reveal } from '@/components/reveal';
import { Container, PageHero, SectionHeading } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { PartnershipRoute } from '@/types';

type Props = { routes: PartnershipRoute[]; interests: string[]; development: string[] };

export default function GetInvolved({ routes: partnershipRoutes, interests, development }: Props) {
    const [interest, setInterest] = useState<string>('');

    const choose = (value: string) => {
        setInterest(value);
        document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <Head title="Partner with us">
                <meta name="description" content="Ways to partner with PHDS on funding, research, expertise and joint projects." />
            </Head>

            <PageHero
                eyebrow="Get involved"
                title="Partner with us."
                lede="PHDS is building the partnerships that will carry its work across the Lake Victoria basin. Tell us how you would like to contribute."
                image="/images/shared-shoreline.jpg"
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Get involved' }]}
            />

            <section className="py-20 sm:py-24">
                <Container>
                    <Reveal>
                        <SectionHeading eyebrow="Ways to help" title="Choose how you would like to work with us." />
                    </Reveal>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {partnershipRoutes.map((route, index) => (
                            <Reveal key={route.title} delay={index * 100}>
                                <button
                                    type="button"
                                    onClick={() => choose(route.interest)}
                                    className="group flex h-full w-full flex-col rounded-3xl border border-border bg-card p-6 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-xl"
                                >
                                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                        <Icon name={route.icon} className="size-6" />
                                    </span>
                                    <span className="mt-5 font-display text-xl font-semibold">{route.title}</span>
                                    <span className="mt-2 flex-1 text-sm text-muted-foreground">{route.body}</span>
                                    <span className="mt-5 text-sm font-semibold text-lake">Start here &rarr;</span>
                                </button>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="bg-muted py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-2">
                        <SectionHeading
                            eyebrow="Get in touch"
                            title="Tell us about your idea."
                            lede="We read every message. Share a little about who you are and what you have in mind."
                        />
                        <div className="mt-8 rounded-3xl bg-band p-7 text-band-foreground">
                            <p className="text-sm font-semibold uppercase tracking-widest text-accent">What we are building</p>
                            <ul className="mt-4 space-y-2 text-sm text-band-muted">
                                {development.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                    <Reveal className="lg:col-span-3" delay={120}>
                        <ContactForm interests={interests} presetInterest={interest} />
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
