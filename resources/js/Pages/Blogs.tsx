import { Head } from '@inertiajs/react';
import { BlogGrid } from '@/Components/blog-grid';
import { Pagination } from '@/Components/pagination';
import { Container, Hl, PageHero } from '@/Components/ui';
import { routes } from '@/lib/routes';
import type { BlogPost, Paginated } from '@/types';

export default function Blogs({ posts }: { posts: Paginated<BlogPost> }) {
    return (
        <>
            <Head title="Blog">
                <meta
                    name="description"
                    content="News, field notes and stories from PHDS and the communities of the Lake Victoria Basin."
                />
            </Head>

            <PageHero
                eyebrow="Blog"
                title={
                    <>
                        News and <Hl light>stories</Hl>.
                    </>
                }
                lede="Field notes, updates and stories from PHDS and the communities of the Lake Victoria Basin."
                crumbs={[{ label: 'Home', href: routes.home }, { label: 'Blog' }]}
            />

            <section className="py-16 sm:py-24">
                <Container>
                    {posts.data.length > 0 ? (
                        <>
                            <BlogGrid posts={posts.data} />
                            <Pagination links={posts.links} />
                        </>
                    ) : (
                        <p className="rounded-3xl border border-border bg-card p-10 text-center text-lg text-muted-foreground">
                            No posts yet. Please check back soon.
                        </p>
                    )}
                </Container>
            </section>
        </>
    );
}
