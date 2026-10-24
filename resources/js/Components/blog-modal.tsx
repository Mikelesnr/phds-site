import { ChevronLeft, ChevronRight, ImageOff, Play, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { BlogPost, BlogVideo } from '@/types';

type MediaItem =
    | { type: 'video'; video: BlogVideo }
    | { type: 'image'; src: string };

function MediaViewer({ post }: { post: BlogPost }) {
    const items: MediaItem[] = [
        ...post.videos.map((video) => ({ type: 'video' as const, video })),
        ...post.images.map((src) => ({ type: 'image' as const, src })),
    ];
    const [selected, setSelected] = useState(0);
    const [broken, setBroken] = useState<Record<string, boolean>>({});

    if (items.length === 0) return null;

    const current = items[Math.min(selected, items.length - 1)];

    return (
        <div className="bg-ink">
            <div className="aspect-video w-full">
                {current.type === 'video' ? (
                    <iframe
                        key={current.video.embed}
                        src={current.video.embed}
                        title={`${post.title} (${current.video.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video)`}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        loading="lazy"
                        className="size-full border-0"
                    />
                ) : broken[current.src] ? (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-white/70">
                        <ImageOff className="size-8" aria-hidden="true" />
                        <p className="text-sm">This picture could not be loaded.</p>
                    </div>
                ) : (
                    <img
                        src={current.src}
                        alt={`${post.title}, picture ${selected + 1}`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                            setBroken((value) => ({ ...value, [current.src]: true }))
                        }
                        className="size-full object-contain"
                    />
                )}
            </div>

            {items.length > 1 && (
                <ul className="flex gap-2 overflow-x-auto p-3" aria-label="Media in this post">
                    {items.map((item, index) => {
                        const thumb =
                            item.type === 'image'
                                ? item.src
                                : item.video.thumbnail;
                        const label =
                            item.type === 'video'
                                ? `Show video ${index + 1}`
                                : `Show picture ${index - post.videos.length + 1}`;

                        return (
                            <li key={`${item.type}-${index}`} className="shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSelected(index)}
                                    aria-label={label}
                                    aria-pressed={index === selected}
                                    className={cn(
                                        'relative block h-16 w-24 overflow-hidden rounded-lg border-2 bg-band',
                                        index === selected
                                            ? 'border-lime'
                                            : 'border-transparent opacity-70 hover:opacity-100',
                                    )}
                                >
                                    {thumb && (
                                        <img
                                            src={thumb}
                                            alt=""
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            className="size-full object-cover"
                                        />
                                    )}
                                    {item.type === 'video' && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                            <Play className="size-5 fill-current" aria-hidden="true" />
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/**
 * Popup reader. Opens over the page instead of loading a new one, which
 * saves space on phones, and lets visitors step between posts.
 */
export function BlogModal({
    posts,
    index,
    onClose,
    onIndexChange,
}: {
    posts: BlogPost[];
    index: number;
    onClose: () => void;
    onIndexChange: (index: number) => void;
}) {
    const post = posts[index];
    const count = posts.length;
    const titleId = useId();
    const panel = useRef<HTMLDivElement>(null);
    const scroller = useRef<HTMLDivElement>(null);

    const go = useCallback(
        (delta: number) => onIndexChange((index + delta + count) % count),
        [index, count, onIndexChange],
    );

    // Lock page scroll while open, and give focus back to the card afterwards.
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panel.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    // Start each post at the top.
    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
    }, [post.id]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            } else if (event.key === 'ArrowRight' && count > 1) {
                go(1);
            } else if (event.key === 'ArrowLeft' && count > 1) {
                go(-1);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, go, count]);

    // Keep Tab inside the popup while it is open.
    const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab' || !panel.current) return;
        const focusable = panel.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const paragraphs = post.body.split(/\n{2,}/).filter((text) => text.trim() !== '');
    const navButton =
        'inline-flex size-10 items-center justify-center rounded-full border border-border transition hover:bg-muted';

    // Rendered in a portal so page animations can never clip or offset it.
    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
            role="presentation"
        >
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={trapTab}
                className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-card text-card-foreground shadow-2xl outline-none sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-3xl"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
                    {count > 1 ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                aria-label="Previous post"
                                className={navButton}
                            >
                                <ChevronLeft className="size-5" aria-hidden="true" />
                            </button>
                            <span
                                className="min-w-14 text-center text-sm font-semibold text-muted-foreground"
                                aria-live="polite"
                            >
                                {index + 1} of {count}
                            </span>
                            <button
                                type="button"
                                onClick={() => go(1)}
                                aria-label="Next post"
                                className={navButton}
                            >
                                <ChevronRight className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <span />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={navButton}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <div ref={scroller} className="overflow-y-auto overscroll-contain">
                    <MediaViewer key={post.id} post={post} />
                    <article className="p-6 sm:p-10">
                        <p className="text-sm font-semibold text-highlight">
                            {[post.published_label, post.author]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                        <h2
                            id={titleId}
                            className="mt-2 text-3xl font-medium leading-tight sm:text-4xl"
                        >
                            {post.title}
                        </h2>
                        <p className="mt-4 text-lg font-medium text-muted-foreground">
                            {post.excerpt}
                        </p>
                        <div className="mt-8 space-y-5 text-lg leading-relaxed">
                            {paragraphs.map((text, i) => (
                                <p key={i} className="whitespace-pre-line">
                                    {text}
                                </p>
                            ))}
                        </div>
                    </article>
                </div>
            </div>
        </div>,
        document.body,
    );
}
