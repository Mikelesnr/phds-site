import { usePage } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { SharedProps } from '@/types';

function FlashToast() {
    const message = usePage<SharedProps>().props.flash.success;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!message) return;
        setVisible(true);
        const timer = window.setTimeout(() => setVisible(false), 7000);
        return () => window.clearTimeout(timer);
    }, [message]);

    return (
        <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            {message && visible && (
                <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-lake" aria-hidden="true" />
                    <p className="text-sm">{message}</p>
                    <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss message" className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground">
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function SiteLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#main"
                className="sr-only z-[70] rounded-full bg-accent px-5 py-3 font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
                {children}
            </main>
            <SiteFooter />
            <FlashToast />
        </div>
    );
}
