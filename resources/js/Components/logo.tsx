import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            className={cn('size-10', className)}
            aria-hidden="true"
        >
            <circle cx="32" cy="32" r="32" fill="#84BB5C" />
            <path
                d="M32 13c9 7 13 14 13 20a13 13 0 0 1-26 0c0-6 4-13 13-20Z"
                fill="#1D3217"
            />
            <path
                d="M15 44c6 4 11 4 17 0s11-4 17 0"
                fill="none"
                stroke="#1D3217"
                strokeWidth="4"
                strokeLinecap="round"
            />
        </svg>
    );
}
