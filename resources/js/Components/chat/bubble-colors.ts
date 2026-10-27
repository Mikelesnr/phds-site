/**
 * Received messages take a colour from the sender, so in a group every person
 * has their own. Class names are written out in full so Tailwind can see them.
 */
const palette = [
    { bubble: 'bg-sky-100 text-sky-950 dark:bg-sky-900/60 dark:text-sky-50', name: 'text-sky-700 dark:text-sky-300' },
    { bubble: 'bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-50', name: 'text-amber-700 dark:text-amber-300' },
    { bubble: 'bg-rose-100 text-rose-950 dark:bg-rose-900/50 dark:text-rose-50', name: 'text-rose-700 dark:text-rose-300' },
    { bubble: 'bg-violet-100 text-violet-950 dark:bg-violet-900/55 dark:text-violet-50', name: 'text-violet-700 dark:text-violet-300' },
    { bubble: 'bg-teal-100 text-teal-950 dark:bg-teal-900/55 dark:text-teal-50', name: 'text-teal-700 dark:text-teal-300' },
    { bubble: 'bg-orange-100 text-orange-950 dark:bg-orange-900/50 dark:text-orange-50', name: 'text-orange-700 dark:text-orange-300' },
    { bubble: 'bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-900/50 dark:text-fuchsia-50', name: 'text-fuchsia-700 dark:text-fuchsia-300' },
    { bubble: 'bg-indigo-100 text-indigo-950 dark:bg-indigo-900/55 dark:text-indigo-50', name: 'text-indigo-700 dark:text-indigo-300' },
];

/** Same person, same colour, on every screen: a small stable hash of their id. */
export function colorFor(userId: string | null) {
    let hash = 0;
    for (const char of userId ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return palette[hash % palette.length];
}

/** Your own messages use the site's lime, the same in groups and direct chats. */
export const ownBubble = {
    bubble: 'bg-accent text-accent-foreground',
    name: 'text-accent-foreground/80',
};
