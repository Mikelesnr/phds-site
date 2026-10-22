import { usePage } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { SiteFooter } from '@/Components/site-footer';
import { SiteHeader } from '@/Components/site-header';
import { ButtonLink } from '@/Components/ui';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { SharedProps } from '@/types';

const BANNER_KEY = 'phds-banner-dismissed';

function FlashToast({ raised }: { raised: boolean }) {
    const message = usePage<SharedProps>().props.flash.success;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        const timer = window.setTimeout(() => setVisible(false), 7000);
        return () => window.clearTimeout(timer);
    }, [message]);

    return (
        <div
            aria-live="polite"
            role="status"
            className={cn(
                'pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4',
                raised ? 'bottom-24' : 'bottom-6',
            )}
        >
            {message && visible && (
                <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl">
                    <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-highlight"
                        aria-hidden="true"
                    />
                    <p className="text-sm">{message}</p>
                    <button
                        type="button"
                        onClick={() => setVisible(false)}
                        aria-label="Dismiss message"
                        className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
}

/** Sticky bar along the bottom, echoing the template's "Partner Now" strip. */
function PartnerBanner({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-banner text-white shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
            <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-5 py-3 sm:gap-5">
                <p className="text-center text-sm font-semibold sm:text-lg">
                    Building partnerships across Lake Victoria.{' '}
                    <span className="hidden text-lime sm:inline">
                        Help the work grow.
                    </span>
                </p>
                <ButtonLink
                    href={routes.getInvolved}
                    variant="accent"
                    className="shrink-0 px-4 py-2 text-sm"
                >
                    Partner Now
                </ButtonLink>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss banner"
                    className="shrink-0 rounded p-1.5 text-white/70 hover:text-white"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
    const [bannerVisible, setBannerVisible] = useState(false);

    useEffect(() => {
        try {
            setBannerVisible(sessionStorage.getItem(BANNER_KEY) !== '1');
        } catch {
            setBannerVisible(true);
        }
    }, []);

    const dismissBanner = () => {
        setBannerVisible(false);
        try {
            sessionStorage.setItem(BANNER_KEY, '1');
        } catch {
            // storage unavailable, the banner just returns on the next visit
        }
    };

    return (
        <div className={cn('flex min-h-screen flex-col', bannerVisible && 'pb-16')}>
            <a
                href="#main"
                className="sr-only z-[70] rounded-lg bg-accent px-5 py-3 font-bold text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
                {children}
            </main>
            <SiteFooter />
            {bannerVisible && <PartnerBanner onDismiss={dismissBanner} />}
            <FlashToast raised={bannerVisible} />
        </div>
    );
}
