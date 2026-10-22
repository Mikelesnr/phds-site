import { Link, usePage } from '@inertiajs/react';
import { Mail, MapPin } from 'lucide-react';
import { LogoMark } from '@/components/logo';
import { NewsletterForm } from '@/components/newsletter-form';
import { Container } from '@/components/ui';
import { routes } from '@/lib/routes';
import type { SharedProps } from '@/types';

const linkClass = 'text-band-muted transition hover:text-white hover:underline';

export function SiteFooter() {
    const { props } = usePage<SharedProps>();
    const { site, nav } = props;

    return (
        <footer className="bg-band text-band-foreground">
            <Container className="grid gap-12 py-16 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-3">
                        <LogoMark className="ring-white/20" />
                        <p className="font-display text-xl font-semibold">{site.shortName}</p>
                    </div>
                    <p className="mt-4 max-w-sm text-sm text-band-muted">{site.name}</p>
                    <p className="mt-2 max-w-sm text-sm text-band-muted">{site.registration}.</p>
                    <ul className="mt-6 space-y-2 text-sm text-band-muted">
                        <li className="flex items-center gap-2">
                            <MapPin className="size-4 text-accent" aria-hidden="true" />
                            {site.contactLocation}
                        </li>
                        {site.contactEmail && (
                            <li className="flex items-center gap-2">
                                <Mail className="size-4 text-accent" aria-hidden="true" />
                                <a className={linkClass} href={`mailto:${site.contactEmail}`}>
                                    {site.contactEmail}
                                </a>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
                    <nav aria-label="About">
                        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-accent">About</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><Link className={linkClass} href={routes.about}>Our story</Link></li>
                            <li><Link className={linkClass} href={routes.board}>Board</Link></li>
                            <li><Link className={linkClass} href={routes.whereWeWork}>Where we work</Link></li>
                        </ul>
                    </nav>
                    <nav aria-label="Focus areas" className="sm:col-span-1">
                        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-accent">Focus areas</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            {nav.focusAreas.map((area) => (
                                <li key={area.slug}>
                                    <Link className={linkClass} href={routes.focusArea(area.slug)}>{area.title}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <nav aria-label="Get involved">
                        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-accent">Get involved</h2>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><Link className={linkClass} href={routes.getInvolved}>Partner with us</Link></li>
                            <li><Link className={linkClass} href={routes.contact}>Contact</Link></li>
                        </ul>
                    </nav>
                </div>

                <div className="relative lg:col-span-3">
                    <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-accent">Email updates</h2>
                    <p className="mb-4 mt-4 text-sm text-band-muted">Follow the work as it grows around Lake Victoria.</p>
                    <NewsletterForm />
                </div>
            </Container>

            <div className="border-t border-white/10">
                <Container className="flex flex-col gap-2 py-6 text-xs text-band-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
                    <p>{site.tagline}</p>
                </Container>
            </div>
        </footer>
    );
}
