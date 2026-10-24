import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Container } from '@/Components/ui';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { AdminBlogForm } from '@/types';

type Props = { blog: AdminBlogForm | null; canManageFeatured: boolean };

const field =
    'w-full rounded-lg border border-border bg-card px-4 py-3 text-base text-card-foreground placeholder:text-muted-foreground focus:border-highlight focus:ring-0';

function Field({
    label,
    htmlFor,
    hint,
    error,
    children,
}: {
    label: string;
    htmlFor: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-base font-bold">
                {label}
            </label>
            {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
            <div className="mt-2">{children}</div>
            {error && (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}

function videoProvider(url: string): string | null {
    if (/(^|\/\/)(www\.|m\.)?(youtube\.com|youtu\.be)/i.test(url)) return 'YouTube';
    if (/(^|\/\/)(www\.|player\.)?vimeo\.com/i.test(url)) return 'Vimeo';
    return null;
}

/** A list of link inputs with add and remove, used for pictures and videos. */
function LinkList({
    legend,
    hint,
    values,
    max,
    placeholder,
    kind,
    errors,
    onChange,
}: {
    legend: string;
    hint: string;
    values: string[];
    max: number;
    placeholder: string;
    kind: 'image' | 'video';
    errors: Record<string, string | undefined>;
    onChange: (values: string[]) => void;
}) {
    const name = kind === 'image' ? 'images' : 'videos';

    return (
        <fieldset>
            <legend className="text-base font-bold">{legend}</legend>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>

            <ul className="mt-3 space-y-3">
                {values.map((value, index) => {
                    const error = errors[`${name}.${index}`];
                    const provider = kind === 'video' && value ? videoProvider(value) : null;

                    return (
                        <li key={index}>
                            <div className="flex items-start gap-3">
                                {kind === 'image' && value.startsWith('https://') && (
                                    <img
                                        src={value}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        onError={(event) => {
                                            event.currentTarget.style.visibility = 'hidden';
                                        }}
                                        className="h-12 w-16 shrink-0 rounded-lg border border-border object-cover"
                                    />
                                )}
                                <div className="min-w-0 flex-1">
                                    <label className="sr-only" htmlFor={`${name}-${index}`}>
                                        {kind === 'image' ? 'Picture' : 'Video'} link {index + 1}
                                    </label>
                                    <input
                                        id={`${name}-${index}`}
                                        type="url"
                                        inputMode="url"
                                        value={value}
                                        placeholder={placeholder}
                                        onChange={(event) =>
                                            onChange(
                                                values.map((item, i) =>
                                                    i === index ? event.target.value : item,
                                                ),
                                            )
                                        }
                                        aria-invalid={Boolean(error)}
                                        className={field}
                                    />
                                    {provider && (
                                        <p className="mt-1 text-sm font-semibold text-highlight">
                                            {provider} link
                                        </p>
                                    )}
                                    {kind === 'video' && value && !provider && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Use a YouTube or Vimeo link.
                                        </p>
                                    )}
                                    {error && (
                                        <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                            {error}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onChange(values.filter((_, i) => i !== index))}
                                    aria-label={`Remove ${kind} ${index + 1}`}
                                    className="mt-1.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border transition hover:bg-muted"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {values.length < max && (
                <button
                    type="button"
                    onClick={() => onChange([...values, ''])}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
                >
                    <Plus className="size-4" aria-hidden="true" />
                    Add {kind === 'image' ? 'a picture' : 'a video'}
                </button>
            )}
        </fieldset>
    );
}

export default function Form({ blog, canManageFeatured }: Props) {
    const form = useForm({
        title: blog?.title ?? '',
        excerpt: blog?.excerpt ?? '',
        body: blog?.body ?? '',
        images: blog?.images ?? ([] as string[]),
        videos: blog?.videos ?? ([] as string[]),
        publish: blog ? blog.published : true,
        is_featured: blog?.is_featured ?? false,
    });
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        // Empty rows are dropped before sending.
        form.transform((data) => ({
            ...data,
            images: data.images.map((item) => item.trim()).filter(Boolean),
            videos: data.videos.map((item) => item.trim()).filter(Boolean),
            is_featured: canManageFeatured ? data.is_featured : false,
        }));

        if (blog) {
            form.put(routes.adminBlog(blog.id));
        } else {
            form.post(routes.adminBlogs);
        }
    };

    const remove = () => {
        if (blog && window.confirm(`Delete "${blog.title}"? This cannot be undone.`)) {
            router.delete(routes.adminBlog(blog.id));
        }
    };

    return (
        <>
            <Head title={blog ? 'Edit post' : 'New post'} />

            <Container className="max-w-3xl py-10">
                <Link
                    href={routes.adminBlogs}
                    className="text-sm font-bold text-highlight hover:underline"
                >
                    &larr; All posts
                </Link>
                <h1 className="mt-3 text-4xl font-medium">
                    {blog ? 'Edit post' : 'New post'}
                </h1>

                <form onSubmit={submit} noValidate className="mt-8 space-y-8">
                    <Field label="Title" htmlFor="title" error={errors.title}>
                        <input
                            id="title"
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            maxLength={160}
                            className={field}
                        />
                    </Field>

                    <Field
                        label="Summary"
                        htmlFor="excerpt"
                        hint="Shown on the card. Keep it to a sentence or two."
                        error={errors.excerpt}
                    >
                        <textarea
                            id="excerpt"
                            rows={3}
                            maxLength={300}
                            value={form.data.excerpt}
                            onChange={(event) => form.setData('excerpt', event.target.value)}
                            className={field}
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {form.data.excerpt.length} / 300
                        </p>
                    </Field>

                    <Field
                        label="Article"
                        htmlFor="body"
                        hint="Plain text. Leave a blank line between paragraphs."
                        error={errors.body}
                    >
                        <textarea
                            id="body"
                            rows={14}
                            value={form.data.body}
                            onChange={(event) => form.setData('body', event.target.value)}
                            className={cn(field, 'leading-relaxed')}
                        />
                    </Field>

                    <LinkList
                        legend="Pictures"
                        hint="Links to pictures hosted elsewhere. They must start with https://. The first one is the card picture."
                        values={form.data.images}
                        max={10}
                        placeholder="https://example.org/picture.jpg"
                        kind="image"
                        errors={errors}
                        onChange={(values) => form.setData('images', values)}
                    />
                    {errors.images && (
                        <p className="-mt-6 text-sm font-medium text-red-600 dark:text-red-400">
                            {errors.images}
                        </p>
                    )}

                    <LinkList
                        legend="Videos"
                        hint="YouTube or Vimeo links."
                        values={form.data.videos}
                        max={5}
                        placeholder="https://www.youtube.com/watch?v=..."
                        kind="video"
                        errors={errors}
                        onChange={(values) => form.setData('videos', values)}
                    />

                    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={form.data.publish}
                                onChange={(event) => form.setData('publish', event.target.checked)}
                                className="mt-1 size-5 rounded border-border text-primary focus:ring-ring"
                            />
                            <span>
                                <span className="block font-bold">Published</span>
                                <span className="text-sm text-muted-foreground">
                                    Untick to keep this post as a draft that visitors cannot see.
                                </span>
                            </span>
                        </label>

                        <label
                            className={cn(
                                'flex items-start gap-3',
                                canManageFeatured ? 'cursor-pointer' : 'opacity-60',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={form.data.is_featured}
                                disabled={!canManageFeatured}
                                onChange={(event) =>
                                    form.setData('is_featured', event.target.checked)
                                }
                                className="mt-1 size-5 rounded border-border text-primary focus:ring-ring"
                            />
                            <span>
                                <span className="block font-bold">Featured on the home page</span>
                                <span className="text-sm text-muted-foreground">
                                    {canManageFeatured
                                        ? 'The three most recent featured posts appear on the home page.'
                                        : 'Only administrators can change this.'}
                                </span>
                            </span>
                        </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-accent px-8 py-3.5 text-base font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
                            >
                                {form.processing ? 'Saving...' : 'Save post'}
                            </button>
                            <Link
                                href={routes.adminBlogs}
                                className="rounded-lg border border-border px-6 py-3.5 text-base font-bold transition hover:bg-muted"
                            >
                                Cancel
                            </Link>
                        </div>
                        {blog && canManageFeatured && (
                            <button
                                type="button"
                                onClick={remove}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 px-5 py-3.5 text-base font-bold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Delete
                            </button>
                        )}
                    </div>
                </form>
            </Container>
        </>
    );
}
