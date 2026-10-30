import { Link } from '@inertiajs/react';

interface CampaignSummary {
    id: string;
    title: string;
    slug: string;
    is_active: boolean;
    is_open: boolean;
    goal_amount: number | string;
    raised: number | string;
    donors: number;
    blog?: string | null;
    ends_label?: string | null;
}

interface IndexProps {
    campaigns: CampaignSummary[];
}

export default function Index({ campaigns }: IndexProps) {
    return (
        <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                <Link
                    href="/admin/campaigns/create"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                    Create Campaign
                </Link>
            </div>

            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Goal / Raised
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Donors
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Ends
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {campaigns.map((campaign) => (
                            <tr key={campaign.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {campaign.title}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {campaign.blog ||
                                            'No blog post attached'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        KES {campaign.goal_amount}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Raised: KES {campaign.raised}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                    >
                                        {campaign.is_active
                                            ? 'Active'
                                            : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                    {campaign.donors}
                                </td>
                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                    {campaign.ends_label || 'No end date'}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                    <Link
                                        href={`/admin/campaigns/${campaign.id}/edit`}
                                        className="mr-4 text-indigo-600 hover:text-indigo-900"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-4 text-center text-sm text-gray-500"
                                >
                                    No campaigns found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
