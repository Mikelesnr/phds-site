import { Head, Link } from '@inertiajs/react';
import { DonationForm, type FormConfig } from '@/Components/donate/donation-form';
import { Reveal } from '@/Components/reveal';
import { Container, Eyebrow, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';

type Story = { title: string; body: string; images: string[]; videos: string[]; excerpt: string; date: string | null; author: string | null } | null;
type Campaign = {
    id: string;
    title: string;
    summary: string;
    goal_amount: number | null;
    raised: number;
    donors: number;
    percent: number | null;
    ends_label: string | null;
    cover: string | null;
    story: Story;
};

export default function DonateCampaign({ campaign, open, form }: { campaign: Campaign; open: boolean; form: FormConfig }) {
    return (
        <>
            <Head title={campaign.title}>
                <meta name="description" content={campaign.summary} />
            </Head>

            <PageHero
                eyebrow="Campaign"
                title={campaign.title}
                lede={campaign.summary}
                image={campaign.cover ?? undefined}
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Donate', href: routes.donate }, { label: campaign.title }]}
            />

            <section className="py-16 sm:py-20">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="lg:col-span-3">
                        {campaign.story ? (
                            <article>
                                <Eyebrow>The story</Eyebrow>
                                <h2 className="mt-3 text-3xl font-medium">{campaign.story.title}</h2>
                                {campaign.story.excerpt && <p className="mt-4 text-lg text-muted-foreground">{campaign.story.excerpt}</p>}
                                <div className="mt-6 space-y-5 text-lg">
                                    {campaign.story.body.split(/\n{2,}/).map((paragraph, i) => (
                                        <p key={i} className="whitespace-pre-line">{paragraph}</p>
                                    ))}
                                </div>
                                {campaign.story.images.length > 0 && (
                                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                        {campaign.story.images.map((src) => (
                                            <img key={src} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                                        ))}
                                    </div>
                                )}
                            </article>
                        ) : (
                            <p className="text-lg text-muted-foreground">{campaign.summary}</p>
                        )}
                    </Reveal>

                    <Reveal className="lg:col-span-2" delay={120}>
                        <div className="rounded-3xl border border-border bg-card p-6">
                            {campaign.goal_amount && (
                                <>
                                    <p className="font-display text-3xl font-medium">KES {campaign.raised.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">
                                        raised of KES {campaign.goal_amount.toLocaleString()} · {campaign.donors} {campaign.donors === 1 ? 'donor' : 'donors'}
                                    </p>
                                    <span className="mt-3 block h-3 overflow-hidden rounded-full bg-muted">
                                        <span className="block h-full bg-accent" style={{ width: `${campaign.percent ?? 0}%` }} />
                                    </span>
                                </>
                            )}
                            {campaign.ends_label && <p className="mt-4 text-sm text-muted-foreground">Open until {campaign.ends_label}</p>}
                        </div>

                        <div className="mt-6">
                            {open ? (
                                <DonationForm config={form} campaignId={campaign.id} campaignTitle={campaign.title} />
                            ) : (
                                <p className="rounded-2xl border border-border bg-muted p-6 text-center text-muted-foreground">
                                    This campaign is closed to new donations. Thank you for your interest.{' '}
                                    <Link href={routes.donate} className="font-bold text-highlight underline">Give to the general fund</Link>.
                                </p>
                            )}
                        </div>
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
