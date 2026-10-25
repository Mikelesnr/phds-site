<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

/**
 * Least privilege. Administrators get no special access to chats: a private
 * conversation is visible only to the people in it.
 */
class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->hasMember($user);
    }

    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return $conversation->hasMember($user);
    }

    public function join(User $user, Conversation $conversation): bool
    {
        return $conversation->isOpen() && ! $conversation->hasMember($user);
    }

    public function leave(User $user, Conversation $conversation): bool
    {
        return $conversation->isGroup()
            && $conversation->hasMember($user)
            && ! $conversation->isModeratedBy($user);
    }

    /** Rename, add or remove people, delete the group. Moderator only. */
    public function moderate(User $user, Conversation $conversation): bool
    {
        return $conversation->isModeratedBy($user);
    }
}
