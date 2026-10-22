<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;

class PageController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('Home', [
            'stats' => config('phds.stats'),
            'quote' => config('phds.quote'),
            'mission' => config('phds.mission'),
            'pillars' => config('phds.pillars'),
            'fieldStory' => config('phds.field_story'),
            'counties' => config('phds.counties'),
            'basin' => config('phds.basin'),
            'focusAreas' => $this->focusAreaCards(),
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    }

    public function about(): Response
    {
        return Inertia::render('About', [
            'story' => config('phds.story'),
            'vision' => config('phds.vision'),
            'mission' => config('phds.mission'),
            'values' => config('phds.values'),
            'objectives' => config('phds.objectives'),
            'development' => config('phds.organisational_development'),
        ]);
    }

    public function board(): Response
    {
        return Inertia::render('Board', [
            'board' => config('phds.board'),
        ]);
    }

    public function whatWeDo(): Response
    {
        return Inertia::render('WhatWeDo', [
            'objectives' => config('phds.objectives'),
            'pillars' => config('phds.pillars'),
            'focusAreas' => $this->focusAreaCards(),
        ]);
    }

    public function focusArea(string $slug): Response
    {
        $areas = config('phds.focus_areas');

        abort_unless(array_key_exists($slug, $areas), 404);

        $slugs = array_keys($areas);
        $position = array_search($slug, $slugs, true);

        $neighbour = fn(int $index) => [
            'slug' => $slugs[$index],
            'title' => $areas[$slugs[$index]]['title'],
        ];

        return Inertia::render('FocusAreaShow', [
            'area' => [...$areas[$slug], 'slug' => $slug],
            'fieldStory' => config('phds.field_story'),
            'previous' => $neighbour(($position - 1 + count($slugs)) % count($slugs)),
            'next' => $neighbour(($position + 1) % count($slugs)),
        ]);
    }

    public function whereWeWork(): Response
    {
        return Inertia::render('WhereWeWork', [
            'basin' => config('phds.basin'),
            'counties' => config('phds.counties'),
            'stats' => config('phds.stats'),
        ]);
    }

    public function getInvolved(): Response
    {
        return Inertia::render('GetInvolved', [
            'routes' => config('phds.partnership_routes'),
            'interests' => config('phds.interests'),
            'development' => config('phds.organisational_development'),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('Contact', [
            'interests' => config('phds.interests'),
        ]);
    }

    /**
     * Compact focus area data for cards and menus.
     *
     * @return list<array<string, mixed>>
     */
    private function focusAreaCards(): array
    {
        return collect(config('phds.focus_areas'))
            ->map(fn(array $area, string $slug) => [
                'slug' => $slug,
                'title' => $area['title'],
                'hook' => $area['hook'],
                'summary' => $area['summary'],
                'icon' => $area['icon'],
                'image' => $area['image'],
            ])
            ->values()
            ->all();
    }
}
