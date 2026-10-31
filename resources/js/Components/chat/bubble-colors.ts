/**
 * Received messages take a colour from the sender, so in a group every person
 * has their own. Class names are written out in full so Tailwind can see them.
 */
const palette = [
    { bubble: 'bg-sky-100 text-sky-950 dark:bg-[#145a3a] dark:text-[#f1ecdf]', name: 'text-sky-700 dark:text-[#cbbfa6]' },
    { bubble: 'bg-amber-100 text-amber-950 dark:bg-[#2f7d5b] dark:text-white', name: 'text-amber-700 dark:text-[#d9efe3]' },
    { bubble: 'bg-rose-100 text-rose-950 dark:bg-[#3d6b52] dark:text-white', name: 'text-rose-700 dark:text-[#cbbfa6]' },
    { bubble: 'bg-violet-100 text-violet-950 dark:bg-[#5b6661] dark:text-white', name: 'text-violet-700 dark:text-[#e0e5e2]' },
    { bubble: 'bg-teal-100 text-teal-950 dark:bg-[#6e6146] dark:text-[#f1ecdf]', name: 'text-teal-700 dark:text-[#e6dcc4]' },
    { bubble: 'bg-orange-100 text-orange-950 dark:bg-[#24484f] dark:text-white', name: 'text-orange-700 dark:text-[#b9d3d8]' },
    { bubble: 'bg-fuchsia-100 text-fuchsia-950 dark:bg-[#4f5e2c] dark:text-white', name: 'text-fuchsia-700 dark:text-[#d6e2b8]' },
    { bubble: 'bg-indigo-100 text-indigo-950 dark:bg-[#0f3f29] dark:text-[#f1ecdf] ring-1 ring-inset ring-[#2f7d5b]', name: 'text-indigo-700 dark:text-[#9fd3b8]' },
];

/** Same person, same colour, on every screen: a small stable hash of their id. */
export function colorFor(userId: string | null) {
    let hash = 0;
    for (const char of userId ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return palette[hash % palette.length];
}

/** Your own messages use the site's accent, the same in groups and direct chats. */
export const ownBubble = {
    bubble: 'bg-accent text-accent-foreground',
    name: 'text-accent-foreground/80',
};
