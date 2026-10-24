import AdminLayout from '@/Layouts/admin-layout';
import { PropsWithChildren, ReactNode } from 'react';

/**
 * Dashboard and profile pages share the back office frame, so they look the
 * same as the blog manager and the public site.
 */
export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    return (
        <AdminLayout>
            {header && (
                <div className="border-b border-border bg-card">
                    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
                        {header}
                    </div>
                </div>
            )}
            {children}
        </AdminLayout>
    );
}
