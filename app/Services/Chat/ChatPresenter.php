<?php

namespace App\Services\Chat;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Shapes chat data for the browser. */
class ChatPresenter
{
    /**
     * Unread messages per conversation for one person.
     *
     * @return Collection<int, int> conversation id => count
     */
    public function unreadCounts(User $user): Collection
    {
        return DB::table('messages')
            ->join('conversation_user as cu', function ($join) use ($user) {
                $join->on('cu.conversation_id', '=', 'messages.conversation_id')
                    ->where('cu.user_id', '=', $user->id);
            })
            ->whereNull('messages.deleted_at')
            ->where(fn ($q) => $q->whereNull('messages.user_id')->orWhere('messages.user_id', '!=', $user->id))
            ->where(fn ($q) => $q->whereNull('cu.last_read_at')->orWhereColumn('messages.created_at', '>', 'cu.last_read_at'))
            ->groupBy('messages.conversation_id')
            ->selectRaw('messages.conversation_id as conversation_id, count(*) as total')
            ->pluck('total', 'conversation_id')
            ->map(fn ($total) => (int) $total);
    }

    public function unreadTotal(User $user): int
    {
        return (int) $this->unreadCounts($user)->sum();
    }

    /**
     * The left-hand list: only conversations this person belongs to.
     *
     * @return array{direct: list<array<string, mixed>>, groups: list<array<string, mixed>>}
     */
    public function sidebar(User $user): array
    {
        $unread = $this->unreadCounts($user);

        $items = $user->conversations()
            ->with(['members:id,name', 'latestMessage'])
            ->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'type' => $c->type->value,
                'visibility' => $c->visibility->value,
                'title' => $c->titleFor($user),
                'preview' => $c->latestMessage ? 'Encrypted message' : null,
                'last_at' => ($c->latestMessage?->created_at ?? $c->created_at)?->toIso8601String(),
                'unread' => $unread->get($c->id, 0),
            ])
            ->sortByDesc('last_at')
            ->values();

        return [
            'direct' => $items->where('type', ConversationType::Direct->value)->values()->all(),
            'groups' => $items->where('type', ConversationType::Group->value)->values()->all(),
        ];
    }

    /**
     * One conversation with ALL of its messages. The thread is loaded whole,
     * not fetched per person, so what you see is exactly what is stored.
     *
     * @return array<string, mixed>
     */
    public function conversation(User $user, Conversation $conversation): array
    {
        $conversation->load(['members:id,name', 'members.chatKey:id,user_id,public_key']);
        $crypto = $this->crypto($user, $conversation);

        $messages = $conversation->messages()
            ->withTrashed()
            ->with('author:id,name')
            ->get()
            ->map(fn ($message) => $message->toChatArray())
            ->all();

        return [
            'id' => $conversation->id,
            'type' => $conversation->type->value,
            'visibility' => $conversation->visibility->value,
            'title' => $conversation->titleFor($user),
            'description' => $conversation->description,
            'is_moderator' => $conversation->isModeratedBy($user),
            'can_leave' => $conversation->isGroup() && ! $conversation->isModeratedBy($user),
            'crypto' => $crypto,
            'members' => $conversation->members
                ->map(fn (User $member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'moderator' => $member->pivot->role === MemberRole::Moderator,
                    'public_key' => $member->chatKey?->public_key,
                    'has_key' => in_array($member->id, $crypto['holders'], true),
                ])
                ->sortBy([['moderator', 'desc'], ['name', 'asc']])
                ->values()
                ->all(),
            'messages' => $messages,
        ];
    }

    /**
     * Everyone the person could message or add. Names and roles only.
     *
     * @return list<array<string, mixed>>
     */
    public function people(User $user): array
    {
        return User::query()
            ->whereKeyNot($user->id)
            ->with('chatKey:id,user_id')
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role->value,
                'has_keys' => $u->chatKey !== null,
            ])
            ->all();
    }

    /**
     * Open groups the person has not joined yet.
     *
     * @return list<array<string, mixed>>
     */
    public function joinableGroups(User $user): array
    {
        return Conversation::query()
            ->where('type', ConversationType::Group->value)
            ->where('visibility', ConversationVisibility::Open->value)
            ->whereDoesntHave('members', fn ($q) => $q->whereKey($user->id))
            ->withCount('members')
            ->orderBy('name')
            ->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'description' => $c->description,
                'members' => $c->members_count,
            ])
            ->all();
    }

    /**
     * What the browser needs to open a conversation: my sealed copies of its keys, and
     * who already has the current one. Everything here is opaque to the server.
     *
     * @return array{key_version: int, my_keys: list<array{version: int, wrapped_key: string}>, provisioned: bool, holders: list<string>}
     */
    public function crypto(User $user, Conversation $conversation): array
    {
        $keys = $conversation->keys()->get(['user_id', 'key_version', 'wrapped_key']);

        return [
            'key_version' => $conversation->key_version,
            'my_keys' => $keys->where('user_id', $user->id)
                ->map(fn ($k) => ['version' => $k->key_version, 'wrapped_key' => $k->wrapped_key])
                ->values()
                ->all(),
            'provisioned' => $keys->contains('key_version', $conversation->key_version),
            'holders' => $keys->where('key_version', $conversation->key_version)->pluck('user_id')->values()->all(),
        ];
    }

    /** A person has now seen everything up to this moment. */
    public function markRead(User $user, Conversation $conversation): void
    {
        $conversation->members()->updateExistingPivot($user->id, ['last_read_at' => now()]);
    }
}
