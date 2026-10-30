<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Settle donations whose callback never arrived. Run `php artisan schedule:work` (or cron) for this.
Schedule::command('donations:reconcile')->everyMinute()->withoutOverlapping();
