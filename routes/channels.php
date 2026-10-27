<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Notifications and chat activity for one person. Only that person may listen.
Broadcast::channel('App.Models.User.{id}', fn (User $user, string $id) => $user->id === $id);

// One channel per conversation. The same rule as viewing it: you must be in it.
Broadcast::channel('conversations.{conversation}', function (User $user, Conversation $conversation) {
    return $user->can('view', $conversation);
});
