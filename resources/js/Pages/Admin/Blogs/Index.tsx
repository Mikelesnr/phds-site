import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '@/Components/pagination';
import { ButtonLink, Container } from '@/Components/ui';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AdminBlogRow, Paginated } from '@/types';

type Props = {
    posts: Paginated<AdminBlogRow>;
    canManageFeatured: boolean;
};

export default function Index({ posts, canManageFeatured }: Props) {
    const toggleFeatured = (post: AdminBlogRow) =>
        router.patch(routes.adminBlogFeatured(post.id), {}, { preserveScroll: true });

    const remove = (post: AdminBlogRow) => {
        if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
            router.delete(routes.adminBlog(post.id), { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Blog posts" />

            <Container className="max-w-6xl py-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-medium">Blog posts</h1>
                        <p className="mt-2 text-muted-foreground">
                            {canManageFeatured
                                ? 'Choose which published posts are featured on the home page.'
                                : 'Write and edit posts. Only administrators can change what is featured.'}
                        </p>
                    </div>
                    <ButtonLink href={routes.adminBlogCreate} variant="accent">
                        New post
                    </ButtonLink>
                </div>

                {posts.data.length === 0 ? (
                    <p className="mt-10 rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
                        No posts yet. Create the first one.
                    </p>
                ) : (
                    <ul className="mt-10 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
                        {posts.data.map((post) => (
                            <li
                                key={post.id}
                                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-lg font-bold">{post.title}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                        <span
                                            className={cn(
                                                'rounded-full px-2.5 py-0.5 text-xs font-bold',
                                                post.status === 'published'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {post.status === 'published' ? 'Published' : 'Draft'}
                                        </span>
                                        {post.is_featured && (
                                            <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs font-bold text-highlight">
                                                Featured
                                            </span>
                                        )}
                                        <span>
                                            {post.status === 'published' && post.published_label
                                                ? `Published ${post.published_label}`
                                                : `Edited ${post.updated_label}`}
                                        </span>
                                        {post.author && <span>by {post.author}</span>}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-3">
                                    {canManageFeatured && (
                                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={post.is_featured}
                                                onClick={() => toggleFeatured(post)}
                                                className={cn(
                                                    'relative h-6 w-11 rounded-full transition',
                                                    post.is_featured ? 'bg-accent' : 'bg-border',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition',
                                                        post.is_featured && 'translate-x-5',
                                                    )}
                                                />
                                                <span className="sr-only">Featured</span>
                                            </button>
                                            Featured
                                        </label>
                                    )}
                                    <Link
                                        href={routes.adminBlogEdit(post.id)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-bold transition hover:bg-muted"
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                        Edit
                                    </Link>
                                    {canManageFeatured && (
                                        <button
                                            type="button"
                                            onClick={() => remove(post)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination links={posts.links} />
            </Container>
        </>
    );
}
