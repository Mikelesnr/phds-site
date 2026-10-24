import { Reveal } from '@/Components/reveal';
import { ButtonLink } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { routes } from '@/lib/routes';
import { Head, Link, usePage } from '@inertiajs/react';

type Props = {
    counts: { published: number; drafts: number; featured: number };
    featured: Array<{ id: number; title: string; published: boolean }>;
    homeLimit: number;
};

export default function Dashboard({ counts, featured, homeLimit }: Props) {
    const user = usePage().props.auth.user;
    const isAdmin = user.role === 'admin';

    const stats = [
        { label: 'Published posts', value: counts.published },
        { label: 'Drafts and scheduled', value: counts.drafts },
        { label: 'Featured on home page', value: counts.featured },
    ];

    return (
        <AuthenticatedLayout
            header={
                <>
                    <h1 className="text-4xl font-medium">
                        Hello, {user.name.split(' ')[0]}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Write posts and choose which ones appear on the home
                        page.
                    </p>
                </>
            }
        >
            <Head title="Dashboard" />

            <div className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-3">
                    {stats.map((stat) => (
                        <Reveal key={stat.label}>
                            <div className="rounded-3xl border border-border bg-card p-6">
                                <p className="font-display text-5xl font-medium">
                                    {stat.value}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {stat.label}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-medium">
                                Featured on the home page
                            </h2>
                            <p className="mt-1 text-muted-foreground">
                                The home page shows up to {homeLimit} featured
                                posts, newest first.
                                {!isAdmin && ' Only administrators choose these.'}
                            </p>
                        </div>
                        <ButtonLink href={routes.adminBlogs} variant="accent">
                            {isAdmin ? 'Choose featured posts' : 'Manage my posts'}
                        </ButtonLink>
                    </div>

                    {featured.length === 0 ? (
                        <p className="mt-6 text-muted-foreground">
                            Nothing is featured yet.
                        </p>
                    ) : (
                        <ul className="mt-6 divide-y divide-border">
                            {featured.map((post) => (
                                <li
                                    key={post.id}
                                    className="flex items-center justify-between gap-4 py-3"
                                >
                                    {isAdmin ? (
                                        <Link
                                            href={`${routes.adminBlogs}/${post.id}/edit`}
                                            className="font-bold hover:text-highlight"
                                        >
                                            {post.title}
                                        </Link>
                                    ) : (
                                        <span className="font-bold">{post.title}</span>
                                    )}
                                    {!post.published && (
                                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                            Not published yet
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
