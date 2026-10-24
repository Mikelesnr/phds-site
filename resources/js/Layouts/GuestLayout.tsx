import { LogoMark } from '@/Components/logo';
import { ThemeToggle } from '@/Components/theme-toggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/** Sign-in frame in the same styling as the public site. */
export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
            <div className="flex flex-col justify-between gap-10 bg-band px-6 py-8 text-band-foreground sm:px-12 lg:py-12">
                <Link href="/" className="flex items-center gap-3">
                    <LogoMark className="size-12" />
                    <span className="font-display text-3xl font-semibold tracking-tight">
                        PHDS
                    </span>
                </Link>
                <div className="hidden lg:block">
                    <p className="font-display text-5xl font-medium leading-[1.05]">
                        A <span className="text-lime">thriving planet</span> for
                        humans and all life forms.
                    </p>
                    <p className="mt-6 max-w-md text-lg text-band-muted">
                        Staff area for managing the PHDS website.
                    </p>
                </div>
                <p className="hidden text-sm text-band-muted lg:block">
                    Planetary Health and Development Stewards
                </p>
            </div>

            <div className="flex flex-col px-6 py-8 sm:px-12">
                <div className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-sm font-bold text-highlight underline-offset-4 hover:underline"
                    >
                        &larr; Back to the site
                    </Link>
                    <ThemeToggle />
                </div>
                <div className="flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 text-card-foreground shadow-sm sm:p-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
