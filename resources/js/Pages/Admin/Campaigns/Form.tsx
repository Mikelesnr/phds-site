import { Link, useForm } from '@inertiajs/react';
import React from 'react';

interface BlogOption {
    id: string;
    title: string;
}

interface CampaignData {
    id: string;
    title: string;
    slug: string;
    summary?: string;
    goal_amount: number | string;
    blog_id?: string;
    is_active: boolean;
    starts_at?: string;
    ends_at?: string;
}

interface FormProps {
    campaign: CampaignData | null;
    blogs: BlogOption[];
}

export default function Form({ campaign, blogs }: FormProps) {
    const isEditing = Boolean(campaign);

    const { data, setData, post, put, processing, errors } = useForm({
        title: campaign?.title || '',
        slug: campaign?.slug || '',
        summary: campaign?.summary || '',
        goal_amount: campaign?.goal_amount || '',
        blog_id: campaign?.blog_id || '',
        is_active: campaign?.is_active ?? true,
        starts_at: campaign?.starts_at || '',
        ends_at: campaign?.ends_at || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && campaign) {
            put(`/admin/campaigns/${campaign.id}`);
        } else {
            post('/admin/campaigns');
        }
    };

    return (
        <div className="mx-auto my-8 max-w-4xl rounded-lg bg-white px-6 py-10 shadow">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Campaign' : 'Create Campaign'}
                </h1>
                <Link
                    href="/admin/campaigns"
                    className="text-sm text-gray-600 underline hover:text-gray-900"
                >
                    Back to Campaigns
                </Link>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Campaign Title
                    </label>
                    <input
                        type="text"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.title && (
                        <div className="mt-1 text-sm text-red-500">
                            {errors.title}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Slug
                    </label>
                    <input
                        type="text"
                        value={data.slug}
                        onChange={(e) => setData('slug', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.slug && (
                        <div className="mt-1 text-sm text-red-500">
                            {errors.slug}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Summary / Story
                    </label>
                    <textarea
                        rows={4}
                        value={data.summary}
                        onChange={(e) => setData('summary', e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.summary && (
                        <div className="mt-1 text-sm text-red-500">
                            {errors.summary}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Goal Amount (KES)
                        </label>
                        <input
                            type="number"
                            value={data.goal_amount}
                            onChange={(e) =>
                                setData('goal_amount', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        {errors.goal_amount && (
                            <div className="mt-1 text-sm text-red-500">
                                {errors.goal_amount}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Associated Blog Post
                        </label>
                        <select
                            value={data.blog_id}
                            onChange={(e) => setData('blog_id', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">-- None --</option>
                            {blogs.map((blog) => (
                                <option key={blog.id} value={blog.id}>
                                    {blog.title}
                                </option>
                            ))}
                        </select>
                        {errors.blog_id && (
                            <div className="mt-1 text-sm text-red-500">
                                {errors.blog_id}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Starts At
                        </label>
                        <input
                            type="datetime-local"
                            value={data.starts_at}
                            onChange={(e) =>
                                setData('starts_at', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        {errors.starts_at && (
                            <div className="mt-1 text-sm text-red-500">
                                {errors.starts_at}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Ends At
                        </label>
                        <input
                            type="datetime-local"
                            value={data.ends_at}
                            onChange={(e) => setData('ends_at', e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        {errors.ends_at && (
                            <div className="mt-1 text-sm text-red-500">
                                {errors.ends_at}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(e) =>
                                setData('is_active', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                            Active Campaign
                        </span>
                    </label>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {processing
                            ? 'Saving...'
                            : isEditing
                              ? 'Update Campaign'
                              : 'Create Campaign'}
                    </button>
                </div>
            </form>
        </div>
    );
}
