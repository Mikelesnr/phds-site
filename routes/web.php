<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\ChatKeyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TeamChatController;
use App\Http\Controllers\TeamMessageController;
use App\Http\Controllers\DashboardController;
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

Route::get('/blogs', [BlogController::class, 'index'])->name('blogs.index');

// Back office. Staff type this address; it is not linked from the public site.
Route::middleware('auth')
    ->prefix('admin/blogs')
    ->name('admin.blogs.')
    ->controller(BlogController::class)
    ->group(function () {
        Route::get('/', 'manage')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/{blog}/edit', 'edit')->name('edit');
        Route::put('/{blog}', 'update')->name('update');
        Route::patch('/{blog}/featured', 'toggleFeatured')->name('featured');
        Route::delete('/{blog}', 'destroy')->name('destroy');
    });


Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

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

Route::middleware('throttle:'.config('chatbot.per_minute_limit').',1')->prefix('chat')->name('chat.')->group(function () {
    Route::post('/', [ChatbotController::class, 'ask'])->name('ask');
    Route::get('/news', [ChatbotController::class, 'news'])->name('news');
});

// Back office: user management. Administrators only, enforced by UserPolicy.
Route::middleware('auth')
    ->prefix('admin/users')
    ->name('admin.users.')
    ->controller(UserController::class)
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('/create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('/{user}/edit', 'edit')->name('edit');
        Route::put('/{user}', 'update')->name('update');
        Route::delete('/{user}', 'destroy')->name('destroy');
    });

// Team chat: direct messages, open groups and private groups.
Route::middleware('auth')
    ->prefix('team-chat')
    ->name('team.chat.')
    ->group(function () {
        Route::get('/', [TeamChatController::class, 'index'])->name('index');
        Route::post('/direct', [TeamChatController::class, 'storeDirect'])->name('direct');
        Route::post('/groups', [TeamChatController::class, 'storeGroup'])->name('groups.store');

        Route::get('/{conversation}', [TeamChatController::class, 'show'])->name('show');
        Route::patch('/{conversation}', [TeamChatController::class, 'updateGroup'])->name('update');
        Route::delete('/{conversation}', [TeamChatController::class, 'destroyGroup'])->name('destroy');
        Route::post('/{conversation}/join', [TeamChatController::class, 'join'])->name('join');
        Route::post('/{conversation}/leave', [TeamChatController::class, 'leave'])->name('leave');
        Route::post('/{conversation}/members', [TeamChatController::class, 'addMembers'])->name('members.add');
        Route::delete('/{conversation}/members/{user}', [TeamChatController::class, 'removeMember'])->name('members.remove');
        Route::post('/{conversation}/read', [TeamChatController::class, 'markRead'])->name('read');
        Route::get('/{conversation}/keys', [ChatKeyController::class, 'conversation'])->name('keys.show');
        Route::post('/{conversation}/keys', [ChatKeyController::class, 'grant'])->name('keys.grant');

        Route::middleware('throttle:90,1')->group(function () {
            Route::post('/{conversation}/messages', [TeamMessageController::class, 'store'])->name('messages.store');
            Route::patch('/messages/{message}', [TeamMessageController::class, 'update'])->name('messages.update');
            Route::delete('/messages/{message}', [TeamMessageController::class, 'destroy'])->name('messages.destroy');
        });
    });

// The bell. Always your own notifications.
Route::middleware('auth')
    ->prefix('notifications')
    ->name('notifications.')
    ->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::post('/read-all', [NotificationController::class, 'readAll'])->name('read-all');
        Route::post('/{id}/read', [NotificationController::class, 'read'])->name('read');
    });

// End-to-end encryption identity: public key and a private key only the owner can open.
Route::middleware('auth')
    ->prefix('chat-keys')
    ->name('chat.keys.')
    ->controller(ChatKeyController::class)
    ->group(function () {
        Route::get('/me', 'me')->name('me');
        Route::post('/', 'store')->name('store');
        Route::post('/reset', 'reset')->name('reset');
    });
