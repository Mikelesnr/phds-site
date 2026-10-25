import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** A simple dialog that closes on Escape or when you click outside it. */
export function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
            onPointerDown={(event) => {
                if (!panel.current?.contains(event.target as Node)) onClose();
            }}
        >
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-card text-card-foreground shadow-2xl sm:rounded-[1.75rem]"
            >
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-2xl font-medium">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">{children}</div>
            </div>
        </div>
    );
}
