import { Head } from '@inertiajs/react';
import { Reveal } from '@/components/reveal';
import { ButtonLink, Container, PageHero } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { BoardMember } from '@/types';

function initials(name: string) {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('');
}

export default function Board({ board }: { board: BoardMember[] }) {
    return (
        <>
            <Head title="Board">
                <meta name="description" content="The board of directors that governs Planetary Health and Development Stewards." />
            </Head>

            <PageHero
                eyebrow="Governance"
                title="Our board"
                lede="Professionals in health, law, finance, economics and agriculture, giving PHDS the range of skills its interdisciplinary work needs."
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'About', href: routes.about }, { label: 'Board' }]}
            />

            <section className="py-20 sm:py-24">
                <Container>
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {board.map((member, index) => (
                            <Reveal key={member.name} delay={(index % 3) * 100}>
                                <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-7 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div
                                            aria-hidden="true"
                                            className="flex size-16 items-center justify-center rounded-full bg-band font-display text-2xl font-semibold text-accent"
                                        >
                                            {initials(member.name)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold">{member.name}</h2>
                                            <p className="text-sm font-semibold text-lake">{member.position}</p>
                                        </div>
                                    </div>
                                    <dl className="mt-6 space-y-4 text-sm">
                                        <div>
                                            <dt className="font-semibold uppercase tracking-widest text-muted-foreground">Profession</dt>
                                            <dd className="mt-1 text-base">{member.profession}</dd>
                                        </div>
                                        <div>
                                            <dt className="font-semibold uppercase tracking-widest text-muted-foreground">Contribution</dt>
                                            <dd className="mt-1 text-base">{member.contribution}</dd>
                                        </div>
                                    </dl>
                                </article>
                            </Reveal>
                        ))}
                    </div>

                    <Reveal className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-muted p-8">
                        <p className="max-w-xl text-lg font-medium">
                            Interested in contributing your expertise to PHDS?
                        </p>
                        <ButtonLink href={routes.getInvolved} variant="primary" arrow>
                            Get involved
                        </ButtonLink>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
