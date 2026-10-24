import '../css/app.css';
import './bootstrap';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminLayout from '@/Layouts/admin-layout';
import SiteLayout from '@/Layouts/site-layout';

const appName = 'PHDS';

createInertiaApp({
    title: (title) => (title ? `${title} | ${appName}` : appName),
    resolve: async (name) => {
        const page = await resolvePageComponent<{ default: ResolvedComponent }>(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ResolvedComponent }>('./Pages/**/*.tsx'),
        );

        // Public pages use the site layout. Breeze auth, dashboard and
        // profile pages bring their own layouts and are left alone.
        const ownsLayout =
            name.startsWith('Auth/') ||
            name.startsWith('Profile/') ||
            name === 'Dashboard';

        if (name.startsWith('Admin/')) {
            // Back office pages share one layout in the site's styling.
            page.default.layout ??= (content: ReactNode) => (
                <AdminLayout>{content}</AdminLayout>
            );
        } else if (!ownsLayout) {
            page.default.layout ??= (content: ReactNode) => (
                <SiteLayout>{content}</SiteLayout>
            );
        }

        return page.default;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#84bb5c',
    },
});
