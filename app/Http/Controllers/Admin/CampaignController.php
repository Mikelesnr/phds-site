<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\CampaignRequest;
use App\Models\Blog;
use App\Models\Campaign;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CampaignController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Campaign::class);

        return Inertia::render('Admin/Campaigns/Index', [
            'campaigns' => Campaign::query()->with('blog:id,title')->latest()->get()
                ->map(fn (Campaign $c) => [
                    'id' => $c->id,
                    'title' => $c->title,
                    'slug' => $c->slug,
                    'is_active' => $c->is_active,
                    'is_open' => $c->isOpen(),
                    'goal_amount' => $c->goal_amount,
                    'raised' => $c->raised(),
                    'donors' => $c->donorCount(),
                    'blog' => $c->blog?->title,
                    'ends_label' => $c->ends_at?->format('j M Y'),
                ]),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Campaign::class);

        return Inertia::render('Admin/Campaigns/Form', ['campaign' => null, 'blogs' => $this->blogOptions()]);
    }

    public function store(CampaignRequest $request): RedirectResponse
    {
        Gate::authorize('create', Campaign::class);

        $campaign = new Campaign;
        $campaign->forceFill([...$request->validated(), 'created_by' => $request->user()->id])->save();

        return to_route('admin.campaigns.index')->with('success', "{$campaign->title} was created.");
    }

    public function edit(Campaign $campaign): Response
    {
        Gate::authorize('update', $campaign);

        return Inertia::render('Admin/Campaigns/Form', [
            'campaign' => [
                'id' => $campaign->id,
                'title' => $campaign->title,
                'slug' => $campaign->slug,
                'summary' => $campaign->summary,
                'goal_amount' => $campaign->goal_amount,
                'blog_id' => $campaign->blog_id,
                'is_active' => $campaign->is_active,
                'starts_at' => $campaign->starts_at?->format('Y-m-d\TH:i'),
                'ends_at' => $campaign->ends_at?->format('Y-m-d\TH:i'),
            ],
            'blogs' => $this->blogOptions($campaign->blog_id),
        ]);
    }

    public function update(CampaignRequest $request, Campaign $campaign): RedirectResponse
    {
        Gate::authorize('update', $campaign);

        $campaign->forceFill($request->validated())->save();

        return to_route('admin.campaigns.index')->with('success', "{$campaign->title} was updated.");
    }

    public function destroy(Campaign $campaign): RedirectResponse
    {
        Gate::authorize('delete', $campaign);

        // Money was given to this campaign. Keep the record and switch it off instead.
        if ($campaign->donations()->exists()) {
            throw ValidationException::withMessages([
                'campaign' => 'This campaign has donations, so it cannot be deleted. Switch it off instead.',
            ]);
        }

        $title = $campaign->title;
        $campaign->delete();

        return to_route('admin.campaigns.index')->with('success', "{$title} was deleted.");
    }

    /** @return list<array{id: string, title: string}> published posts, plus the one already attached */
    private function blogOptions(?string $current = null): array
    {
        return Blog::query()
            ->where(fn ($q) => $q->published()->orWhere('id', $current))
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (Blog $b) => ['id' => $b->id, 'title' => $b->title])
            ->all();
    }
}
