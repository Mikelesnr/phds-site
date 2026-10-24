import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-4xl font-medium">Profile</h1>
            }
        >
            <Head title="Profile" />

            <div className="py-10">
                <div className="mx-auto max-w-6xl space-y-6 px-5 sm:px-8">
                    <div className="border border-border bg-card p-4 sm:rounded-3xl sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="border border-border bg-card p-4 sm:rounded-3xl sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="border border-border bg-card p-4 sm:rounded-3xl sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
