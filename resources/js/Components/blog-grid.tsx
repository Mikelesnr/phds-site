import { useEffect, useState } from 'react';
import { BlogCard } from '@/Components/blog-card';
import { BlogModal } from '@/Components/blog-modal';
import { Reveal } from '@/Components/reveal';
import type { BlogPost } from '@/types';

/** Equal-height cards that open a popup reader, used on Home and the Blog page. */
export function BlogGrid({ posts }: { posts: BlogPost[] }) {
    const [active, setActive] = useState<number | null>(null);

    // A new page of posts closes any open popup.
    useEffect(() => setActive(null), [posts]);

    return (
        <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, index) => (
                    <Reveal key={post.id} delay={(index % 3) * 80}>
                        <BlogCard post={post} onOpen={() => setActive(index)} />
                    </Reveal>
                ))}
            </div>

            {active !== null && posts[active] && (
                <BlogModal
                    posts={posts}
                    index={active}
                    onClose={() => setActive(null)}
                    onIndexChange={setActive}
                />
            )}
        </>
    );
}
