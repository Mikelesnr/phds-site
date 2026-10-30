<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Starting a donation sends a prompt to a phone, so it is limited per visitor.
        RateLimiter::for('donations', fn (Request $request) => [
            Limit::perMinute(6)->by($request->ip()),
            Limit::perHour(30)->by($request->ip()),
        ]);
        if (app()->isProduction()) {
            URL::forceScheme('https');
        }
    }
}
