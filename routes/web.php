<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use App\Http\Controllers\InquiryController;
use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::controller(PageController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('/about', 'about')->name('about');
    Route::get('/about/board', 'board')->name('board');
    Route::get('/what-we-do', 'whatWeDo')->name('what-we-do');
    Route::get('/focus-areas/{slug}', 'focusArea')->name('focus-areas.show');
    Route::get('/where-we-work', 'whereWeWork')->name('where-we-work');
    Route::get('/get-involved', 'getInvolved')->name('get-involved');
    Route::get('/contact', 'contact')->name('contact');
});


Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('throttle:6,1')->group(function () {
    Route::post('/contact', [InquiryController::class, 'contact'])->name('contact.store');
    Route::post('/subscribe', [InquiryController::class, 'subscribe'])->name('subscribe.store');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
