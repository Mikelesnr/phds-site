<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/** The group's name, members or existence changed. Open chats refresh themselves. */
class ConversationChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /** @param  'details'|'members'|'keys'|'deleted'  $change */
    public function __construct(public string $conversationId, public string $change) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversations.'.$this->conversationId)];
    }

    public function broadcastAs(): string
    {
        return 'conversation.changed';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['conversation_id' => $this->conversationId, 'change' => $this->change];
    }
}
