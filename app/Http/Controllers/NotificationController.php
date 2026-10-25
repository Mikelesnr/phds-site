<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Notifications\DatabaseNotification;

/** The bell. Everyone only ever sees their own notifications. */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'unread' => $user->unreadNotifications()->count(),
            'items' => $user->notifications()
                ->orderByDesc('updated_at')
                ->limit(15)
                ->get()
                ->map(fn (DatabaseNotification $n) => [
                    'id' => $n->id,
                    'data' => $n->data,
                    'read' => $n->read_at !== null,
                    'created_at' => $n->updated_at?->toIso8601String(),
                ]),
        ]);
    }

    public function read(Request $request, string $id): Response
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return response()->noContent();
    }

    public function readAll(Request $request): Response
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->noContent();
    }
}
