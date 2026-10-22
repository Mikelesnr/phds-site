import { Link, usePage } from '@inertiajs/react';
import { Mail, MapPin } from 'lucide-react';
import { LogoMark } from '@/Components/logo';
import { NewsletterForm } from '@/Components/newsletter-form';
import { Container } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

const linkClass = 'text-band-foreground transition hover:text-lime hover:underline';
const headingClass = 'font-sans text-xl font-bold text-lime';

export function SiteFooter() {
    const { props } = usePage<SharedProps>();
    const { site, nav } = props;

    return (
        <footer className="bg-band text-band-foreground">
            <Container className="grid gap-14 py-16 lg:grid-cols-12 lg:py-20">
                <div className="relative lg:col-span-4">
                    <div className="flex items-center gap-3">
                        <LogoMark className="size-12" />
                        <p className="font-display text-3xl font-semibold tracking-tight">
                            {site.shortName}
                        </p>
                    </div>
                    <h2 className={`${headingClass} mt-12`}>Get Email Updates</h2>
                    <div className="mt-4">
                        <NewsletterForm />
                    </div>
                </div>

                <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
                    <nav aria-label="About">
                        <h2 className={headingClass}>About</h2>
                        <ul className="mt-5 space-y-3">
                            <li><Link className={linkClass} href={routes.about}>Our Story</Link></li>
                            <li><Link className={linkClass} href={routes.whereWeWork}>Where We Work</Link></li>
                            <li><Link className={linkClass} href={routes.board}>Board</Link></li>
                        </ul>
                    </nav>
                    <nav aria-label="Focus areas">
                        <h2 className={headingClass}>Focus Areas</h2>
                        <ul className="mt-5 space-y-3">
                            {nav.focusAreas.map((area) => (
                                <li key={area.slug}>
                                    <Link className={linkClass} href={routes.focusArea(area.slug)}>
                                        {area.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <nav aria-label="Get involved">
                        <h2 className={headingClass}>Get Involved</h2>
                        <ul className="mt-5 space-y-3">
                            <li><Link className={linkClass} href={routes.getInvolved}>Partner With Us</Link></li>
                            <li><Link className={linkClass} href={routes.whatWeDo}>How We Work</Link></li>
                            <li><Link className={linkClass} href={routes.contact}>Contact Us</Link></li>
                        </ul>
                    </nav>

                    <div className="sm:col-span-3">
                        <p className="max-w-md text-band-foreground">{site.name}</p>
                        <ul className="mt-3 space-y-2 text-band-muted">
                            <li className="flex items-center gap-2">
                                <MapPin className="size-4 text-lime" aria-hidden="true" />
                                {site.contactLocation}
                            </li>
                            {site.contactEmail && (
                                <li className="flex items-center gap-2">
                                    <Mail className="size-4 text-lime" aria-hidden="true" />
                                    <a className={linkClass} href={`mailto:${site.contactEmail}`}>
                                        {site.contactEmail}
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </Container>

            <div className="border-t border-white/10">
                <Container className="flex flex-col gap-2 py-6 text-sm text-band-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        &copy; {new Date().getFullYear()}{' '}
                        <span className="text-lime">{site.name}</span>. All rights
                        reserved. {site.registration}.
                    </p>
                    <p>{site.tagline}</p>
                </Container>
            </div>
        </footer>
    );
}
