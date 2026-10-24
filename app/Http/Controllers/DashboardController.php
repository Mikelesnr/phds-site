<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $published = Blog::query()->published()->count();

        return Inertia::render('Dashboard', [
            'counts' => [
                'published' => $published,
                'drafts' => Blog::query()->count() - $published,
                'featured' => Blog::query()->featured()->count(),
            ],
            'featured' => Blog::query()
                ->featured()
                ->latest('published_at')
                ->get(['id', 'title', 'published_at'])
                ->map(fn (Blog $blog) => [
                    'id' => $blog->id,
                    'title' => $blog->title,
                    'published' => $blog->isPublished(),
                ])
                ->all(),
            'homeLimit' => Blog::HOME_FEATURED_LIMIT,
        ]);
    }
}
