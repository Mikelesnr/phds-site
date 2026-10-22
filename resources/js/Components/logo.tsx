import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" className={cn('size-10 rounded-xl ring-1 ring-border', className)} aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#0C2D42" />
            <path d="M32 12c10 8 14 16 14 23a14 14 0 0 1-28 0c0-7 4-15 14-23Z" fill="#F4B63F" />
            <path
                d="M14 44c6 4 10 4 18 0s12-4 18 0"
                fill="none"
                stroke="#1C9A9A"
                strokeWidth="4"
                strokeLinecap="round"
            />
        </svg>
    );
}
