import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Reveal } from '@/Components/reveal';
import { ButtonLink, Container, Eyebrow, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { FieldStory, FocusArea } from '@/types';

type Neighbour = { slug: string; title: string };
type Props = { area: FocusArea; fieldStory: FieldStory; previous: Neighbour; next: Neighbour };

export default function FocusAreaShow({ area, fieldStory, previous, next }: Props) {
    return (
        <>
            <Head title={area.title}>
                <meta name="description" content={area.summary} />
            </Head>

            <PageHero
                eyebrow={area.hook}
                title={area.title}
                lede={area.summary}
                image={area.image}
                crumbs={[
                    { label: 'Home', href: routes.home },
                    { label: 'What we do', href: routes.whatWeDo },
                    { label: area.title },
                ]}
            />

            <section className="py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-2">
                        <Eyebrow>The picture on the ground</Eyebrow>
                        <p className="mt-4 font-display text-2xl font-medium leading-snug sm:text-3xl">{area.intro}</p>
                        {area.case && (
                            <figure className="mt-8 rounded-3xl bg-muted p-6">
                                <figcaption className="text-xs font-semibold uppercase tracking-widest text-highlight">
                                    A case from the lake
                                </figcaption>
                                <blockquote className="mt-2 text-lg font-medium">{area.case}</blockquote>
                            </figure>
                        )}
                    </Reveal>

                    <div className="space-y-6 lg:col-span-3">
                        {area.groups.map((group, index) => (
                            <Reveal key={group.heading} delay={index * 100}>
                                <div className="rounded-3xl border border-border bg-card p-7 sm:p-8">
                                    <h2 className="text-2xl font-medium">{group.heading}</h2>
                                    <ul className="mt-5 space-y-3">
                                        {group.items.map((item) => (
                                            <li key={item} className="flex items-start gap-3">
                                                <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                                    <Check className="size-3.5" aria-hidden="true" />
                                                </span>
                                                <span className="text-lg">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {area.story && (
                <section className="bg-band py-16 text-band-foreground sm:py-20">
                    <Container className="max-w-4xl">
                        <Reveal>
                            <Eyebrow light>{fieldStory.label}</Eyebrow>
                            <p className="mt-4 font-display text-2xl font-medium leading-snug sm:text-3xl">{fieldStory.body}</p>
                            <p className="mt-6 border-l-4 border-accent pl-5 text-lg text-band-muted">{fieldStory.lesson}</p>
                        </Reveal>
                    </Container>
                </section>
            )}

            {area.gallery.length > 0 && (
                <section className="pb-4 pt-4">
                    <Container>
                        <div className={`grid gap-4 ${area.gallery.length > 1 ? 'sm:grid-cols-2' : ''} ${area.gallery.length > 2 ? 'lg:grid-cols-3' : ''}`}>
                            {area.gallery.map((src, index) => (
                                <Reveal key={src} delay={index * 100}>
                                    <img
                                        src={src}
                                        alt={`${area.title}, field photograph ${index + 1}`}
                                        loading="lazy"
                                        className="aspect-[4/3] w-full rounded-3xl object-cover"
                                    />
                                </Reveal>
                            ))}
                        </div>
                    </Container>
                </section>
            )}

            <section className="py-16 sm:py-20">
                <Container>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
                        <Link
                            href={routes.focusArea(previous.slug)}
                            className="group flex flex-1 items-center gap-4 rounded-3xl border border-border bg-card p-6 transition hover:bg-muted"
                        >
                            <ArrowLeft className="size-5 shrink-0 transition group-hover:-translate-x-1" aria-hidden="true" />
                            <span>
                                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Previous</span>
                                <span className="font-display text-xl font-semibold">{previous.title}</span>
                            </span>
                        </Link>
                        <Link
                            href={routes.focusArea(next.slug)}
                            className="group flex flex-1 items-center justify-end gap-4 rounded-3xl border border-border bg-card p-6 text-right transition hover:bg-muted"
                        >
                            <span>
                                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next</span>
                                <span className="font-display text-xl font-semibold">{next.title}</span>
                            </span>
                            <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="mt-10 text-center">
                        <ButtonLink href={routes.getInvolved} variant="accent" arrow>
                            Work with us on {area.title}
                        </ButtonLink>
                    </div>
                </Container>
            </section>
        </>
    );
}
