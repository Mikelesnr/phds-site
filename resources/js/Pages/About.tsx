import { Head } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { Reveal } from '@/Components/reveal';
import { ButtonLink, Coin, Container, Eyebrow, PageHero, SectionHeading } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { Value } from '@/types';

type Props = {
    story: string[];
    vision: string;
    mission: string;
    values: Value[];
    objectives: string[];
    development: string[];
};

export default function About({ story, vision, mission, values, objectives, development }: Props) {
    const [lead, ...rest] = story;

    return (
        <>
            <Head title="Our story">
                <meta name="description" content="How PHDS began in Lambwe Valley and what we stand for." />
            </Head>

            <PageHero
                eyebrow="About PHDS"
                title="Our story"
                lede="Born from the lived experience of a board whose roots are in Lambwe Valley, on the Lake Victoria basin."
                image="/images/landing-site.jpg"
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Our story' }]}
            />

            <section className="py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-3">
                        <p className="font-display text-2xl font-medium leading-snug sm:text-3xl">{lead}</p>
                        <div className="mt-8 space-y-5 text-lg text-muted-foreground">
                            {rest.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>
                    </Reveal>
                    <Reveal className="space-y-6 lg:col-span-2" delay={120}>
                        <div className="rounded-3xl bg-band p-8 text-band-foreground">
                            <Eyebrow light>Our vision</Eyebrow>
                            <p className="mt-3 font-display text-2xl font-semibold leading-snug">{vision}</p>
                        </div>
                        <div className="rounded-3xl border border-border bg-card p-8">
                            <Eyebrow>Our mission</Eyebrow>
                            <p className="mt-3 text-lg font-medium">{mission}</p>
                        </div>
                    </Reveal>
                </Container>
            </section>

            <section id="values" className="scroll-mt-24 bg-muted py-20 sm:py-24">
                <Container>
                    <Reveal>
                        <SectionHeading eyebrow="Values" title="What guides our work." />
                    </Reveal>
                    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        {values.map((value, index) => (
                            <Reveal key={value.title} delay={index * 80}>
                                <div className="h-full rounded-3xl border border-border bg-card p-6">
                                    <Coin name={value.icon} />
                                    <h3 className="mt-5 text-xl font-semibold">{value.title}</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                    <Reveal>
                        <SectionHeading eyebrow="Broad objectives" title="What we set out to do." />
                        <ol className="mt-8 space-y-5">
                            {objectives.map((objective, index) => (
                                <li key={objective} className="flex gap-4">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground">
                                        {index + 1}
                                    </span>
                                    <span className="pt-1 text-lg">{objective}</span>
                                </li>
                            ))}
                        </ol>
                    </Reveal>
                    <Reveal delay={120}>
                        <div id="development" className="scroll-mt-24 rounded-3xl border border-border bg-card p-8 sm:p-10">
                            <Eyebrow>Where we are now</Eyebrow>
                            <h2 className="mt-3 text-2xl font-medium sm:text-3xl">Building the organisation behind the mission.</h2>
                            <p className="mt-4 text-muted-foreground">
                                PHDS is putting its foundations in place. Our current organisational development work includes:
                            </p>
                            <ul className="mt-6 space-y-3">
                                {development.map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                        <Check className="mt-1 size-5 shrink-0 text-highlight" aria-hidden="true" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <ButtonLink href={routes.board} variant="primary" arrow>Meet the board</ButtonLink>
                                <ButtonLink href={routes.getInvolved} variant="outline">Partner with us</ButtonLink>
                            </div>
                        </div>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
