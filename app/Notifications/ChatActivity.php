<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Stored in the database and shown in the bell. Real-time delivery is done
 * separately by ChatNotificationCreated so it never depends on a queue worker.
 */
class ChatActivity extends Notification
{
    /** @param  array<string, mixed>  $payload */
    public function __construct(public array $payload) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return $this->payload;
    }
}
