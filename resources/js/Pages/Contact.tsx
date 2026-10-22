import { Head } from '@inertiajs/react';
import { Mail, MapPin } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { ContactForm } from '@/Components/contact-form';
import { Reveal } from '@/Components/reveal';
import { Container, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

export default function Contact({ interests }: { interests: string[] }) {
    const { site } = usePage<SharedProps>().props;

    return (
        <>
            <Head title="Contact">
                <meta name="description" content="Contact Planetary Health and Development Stewards." />
            </Head>

            <PageHero
                eyebrow="Contact"
                title="Let us talk."
                lede="Questions, ideas or an invitation to collaborate. Send us a message and we will respond."
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Contact' }]}
            />

            <section className="py-20 sm:py-24">
                <Container className="grid gap-12 lg:grid-cols-5 lg:gap-16">
                    <Reveal className="space-y-6 lg:col-span-2">
                        <div className="rounded-3xl border border-border bg-card p-7">
                            <h2 className="text-xl font-medium">{site.name}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{site.registration}</p>
                            <ul className="mt-5 space-y-3">
                                <li className="flex items-center gap-3">
                                    <MapPin className="size-5 text-highlight" aria-hidden="true" />
                                    {site.contactLocation}
                                </li>
                                {site.contactEmail && (
                                    <li className="flex items-center gap-3">
                                        <Mail className="size-5 text-highlight" aria-hidden="true" />
                                        <a href={`mailto:${site.contactEmail}`} className="underline-offset-4 hover:underline">
                                            {site.contactEmail}
                                        </a>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </Reveal>
                    <Reveal className="lg:col-span-3" delay={120}>
                        <ContactForm interests={interests} />
                    </Reveal>
                </Container>
            </section>
        </>
    );
}
