import { Head } from '@inertiajs/react';
import { CountyChart } from '@/Components/county-chart';
import { Reveal } from '@/Components/reveal';
import { ButtonLink, Container, Eyebrow, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { Basin, County, Stat } from '@/types';

type Props = { basin: Basin; counties: County[]; stats: Stat[] };

export default function WhereWeWork({ basin, counties, stats }: Props) {
    return (
        <>
            <Head title="Where we work">
                <meta name="description" content="PHDS works in the five Kenyan counties that share direct shoreline with Lake Victoria." />
            </Head>

            <PageHero
                eyebrow="Geographical and ecological focus"
                title="The Lake Victoria Basin."
                lede={basin.summary}
                image="/images/beach-landing.jpg"
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Where we work' }]}
            />

            <section className="py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                    <Reveal>
                        <Eyebrow>Focus counties</Eyebrow>
                        <h2 className="mt-3 text-3xl font-medium leading-tight sm:text-4xl">
                            Homa Bay, Siaya, Kisumu, Migori and Busia.
                        </h2>
                        <p className="mt-5 text-lg text-muted-foreground">
                            Of the 14 Kenyan counties in the basin, these five share direct shoreline with the lake.
                            Together they are home to 5,290,824 people.
                        </p>
                        <p className="mt-4 text-muted-foreground">
                            The wider catchment is shared by {basin.countries}, so what happens on one shore is felt on
                            the others.
                        </p>
                    </Reveal>
                    <CountyChart counties={counties} />
                </Container>
            </section>

            <section className="bg-band py-16 text-band-foreground sm:py-20">
                <Container className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, index) => (
                        <Reveal key={stat.label} delay={index * 100}>
                            <div className="border-l-2 border-accent pl-5">
                                <p className="font-display text-5xl font-semibold text-accent">{stat.value}</p>
                                <h2 className="mt-2 font-sans text-base font-medium">{stat.label}</h2>
                                <p className="mt-1 text-sm text-band-muted">{stat.note}</p>
                            </div>
                        </Reveal>
                    ))}
                </Container>
            </section>

            <section className="py-20 text-center sm:py-24">
                <Container>
                    <Reveal>
                        <h2 className="mx-auto max-w-2xl text-3xl font-medium sm:text-4xl">See what we are working on across the shoreline.</h2>
                        <div className="mt-8">
                            <ButtonLink href={routes.whatWeDo} variant="primary" arrow>
                                Our focus areas
                            </ButtonLink>
                        </div>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
