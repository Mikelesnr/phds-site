<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],

            'site' => [
                'name' => config('phds.name'),
                'shortName' => config('phds.short_name'),
                'tagline' => config('phds.tagline'),
                'registration' => config('phds.registration'),
                'contactEmail' => config('phds.contact_email'),
                'contactLocation' => config('phds.contact_location'),
            ],

            'nav' => [
                'focusAreas' => collect(config('phds.focus_areas'))
                    ->map(fn (array $area, string $slug) => [
                        'slug' => $slug,
                        'title' => $area['title'],
                        'hook' => $area['hook'],
                        'icon' => $area['icon'],
                    ])
                    ->values()
                    ->all(),
            ],

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
            ],
        ];
    }
}
