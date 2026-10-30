import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Heart } from 'lucide-react';
import { DonationForm, type FormConfig } from '@/Components/donate/donation-form';
import { Reveal } from '@/Components/reveal';
import { ButtonLink, Container, Eyebrow, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';

type Campaign = { slug: string; title: string; summary: string; goal_amount: number | null; raised: number; percent: number | null; cover: string | null };

export default function DonateIndex({ campaigns, form }: { campaigns: Campaign[]; form: FormConfig }) {
    return (
        <>
            <Head title="Donate">
                <meta name="description" content="Support the work of Planetary Health and Development Stewards with an M-Pesa donation." />
            </Head>

            <PageHero
                eyebrow="Donate"
                title="Support a thriving lake."
                lede="Give through M-Pesa. Choose a general gift that supports all of our work, or back a campaign you care about."
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Donate' }]}
            />

            <section className="py-16 sm:py-20">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-3">
                        <Eyebrow>General donation</Eyebrow>
                        <h2 className="mt-3 text-3xl font-medium sm:text-4xl">Where it is needed most</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            A general gift helps us go wherever the work needs it: fishing communities, health outreach,
                            research and the organisation itself.
                        </p>
                        <div className="mt-8 max-w-lg">
                            <DonationForm config={form} campaignId={null} campaignTitle={null} />
                        </div>
                    </Reveal>

                    <Reveal className="lg:col-span-2" delay={120}>
                        <Eyebrow>Campaigns</Eyebrow>
                        <h2 className="mt-3 text-3xl font-medium">Back a specific project</h2>
                        {campaigns.length === 0 ? (
                            <p className="mt-4 text-muted-foreground">No campaigns are open right now. Thank you for giving generally.</p>
                        ) : (
                            <ul className="mt-6 space-y-4">
                                {campaigns.map((campaign) => (
                                    <li key={campaign.slug}>
                                        <Link
                                            href={routes.campaign(campaign.slug)}
                                            className="group flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
                                        >
                                            {campaign.cover && (
                                                <img src={campaign.cover} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl object-cover" />
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-bold group-hover:text-highlight">{campaign.title}</span>
                                                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{campaign.summary}</span>
                                                {campaign.goal_amount && (
                                                    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
                                                        <span className="block h-full bg-accent" style={{ width: `${campaign.percent ?? 0}%` }} />
                                                    </span>
                                                )}
                                                <span className="mt-1 flex items-center gap-1 text-xs font-bold text-highlight">
                                                    Read the story <ArrowRight className="size-3" aria-hidden="true" />
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                            <Heart className="size-4 text-highlight" aria-hidden="true" /> Thank you for supporting the lake and its people.
                        </p>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
