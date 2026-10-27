<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/** Pushes a notification to one person's own private channel. */
class ChatNotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /** @param  array<string, mixed>  $notification */
    public function __construct(public string $userId, public array $notification) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('App.Models.User.'.$this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['notification' => $this->notification];
    }
}
