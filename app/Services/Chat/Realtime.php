<?php

namespace App\Services\Chat;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Broadcasting is a bonus on top of saving. If the websocket server is down or
 * not installed yet, the message is still saved and the chat falls back to polling.
 */
class Realtime
{
    public static function send(object $event, bool $toOthers = false): void
    {
        try {
            $pending = broadcast($event);

            if ($toOthers) {
                $pending->toOthers();
            }

            unset($pending); // dispatches now, inside the try
        } catch (Throwable $e) {
            Log::warning('Broadcast failed', ['event' => $event::class, 'error' => $e->getMessage()]);
        }
    }
}
