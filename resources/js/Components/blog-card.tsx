import { ArrowUpRight, Play, Star } from 'lucide-react';
import { useState } from 'react';
import { LogoMark } from '@/Components/logo';
import type { BlogPost } from '@/types';

/**
 * Fixed-height card so every post lines up the same way. The whole card
 * opens the popup through the "Read more" button.
 */
export function BlogCard({
    post,
    onOpen,
}: {
    post: BlogPost;
    onOpen: () => void;
}) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = post.cover && !imageFailed;

    return (
        <article className="group relative flex h-[28rem] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="relative h-44 shrink-0 overflow-hidden bg-band">
                {showImage ? (
                    <img
                        src={post.cover!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        className="size-full object-cover transition duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <LogoMark className="size-16 opacity-80" />
                    </div>
                )}
                {post.videos.length > 0 && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                        <Play className="size-3.5 fill-current" aria-hidden="true" />
                        Video
                    </span>
                )}
                {post.is_featured && (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                        <Star className="size-3.5 fill-current" aria-hidden="true" />
                        Featured
                    </span>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-6">
                {post.published_label && (
                    <p className="text-sm font-semibold text-highlight">
                        {post.published_label}
                    </p>
                )}
                <h3 className="mt-2 line-clamp-2 text-2xl font-medium leading-tight">
                    {post.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-muted-foreground">
                    {post.excerpt}
                </p>
                <button
                    type="button"
                    onClick={onOpen}
                    aria-haspopup="dialog"
                    className="mt-auto inline-flex items-center gap-1.5 pt-4 text-base font-bold after:absolute after:inset-0 after:content-['']"
                >
                    Read more
                    <span className="sr-only">: {post.title}</span>
                    <ArrowUpRight
                        className="size-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </button>
            </div>
        </article>
    );
}
