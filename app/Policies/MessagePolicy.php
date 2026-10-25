<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;

class MessagePolicy
{
    /** Only the person who wrote a message can edit it. */
    public function update(User $user, Message $message): bool
    {
        return ! $message->trashed()
            && $message->user_id === $user->id
            && $message->conversation->hasMember($user);
    }

    /** The author can delete their own message, a group's moderator can delete any. */
    public function delete(User $user, Message $message): bool
    {
        if ($message->trashed()) {
            return false;
        }

        $conversation = $message->conversation;

        if (! $conversation->hasMember($user)) {
            return false;
        }

        return $message->user_id === $user->id || $conversation->isModeratedBy($user);
    }
}
