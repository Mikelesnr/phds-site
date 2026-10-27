<?php

namespace App\Services\Chat;

use App\Enums\MemberRole;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChatCleanup
{
    /**
     * Run before a user is deleted. A group never ends up without a moderator:
     * the longest-standing member takes over, and a group with nobody left is deleted.
     * Messages stay and show their author as a former member.
     */
    public function forgetUser(User $user): void
    {
        DB::transaction(function () use ($user) {
            Conversation::query()
                ->where('type', 'group')
                ->whereHas('members', fn ($q) => $q->whereKey($user->id)->where('conversation_user.role', MemberRole::Moderator->value))
                ->get()
                ->each(function (Conversation $conversation) use ($user) {
                    $successor = $conversation->members()
                        ->whereKeyNot($user->id)
                        ->orderBy('conversation_user.id')
                        ->first();

                    if ($successor) {
                        $conversation->members()->updateExistingPivot($successor->id, ['role' => MemberRole::Moderator->value]);
                        $conversation->created_by = $successor->id;
                        $conversation->save();
                    } else {
                        $conversation->delete();
                    }
                });

            // Every group they are leaving gets a fresh key.
            Conversation::query()
                ->where('type', 'group')
                ->whereHas('members', fn ($q) => $q->whereKey($user->id))
                ->get()
                ->each(function (Conversation $conversation) use ($user) {
                    $conversation->keys()->where('user_id', $user->id)->delete();
                    $conversation->increment('key_version');
                });

            $user->notifications()->delete();
        });
    }
}
