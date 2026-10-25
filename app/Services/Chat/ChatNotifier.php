<?php

namespace App\Services\Chat;

use App\Events\ChatNotificationCreated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\ChatActivity;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

class ChatNotifier
{
    /** Tell everyone else in the conversation. Several messages collapse into one notification. */
    public function messagePosted(Message $message): void
    {
        $conversation = $message->conversation()->with('members:id,name')->first();
        $sender = $message->author;

        foreach ($conversation->members as $member) {
            if ($member->id === $message->user_id) {
                continue;
            }

            $this->push($member, $conversation, 'message', [
                'sender' => $sender?->name ?? 'Former member',
                'preview' => Str::limit(preg_replace('/\s+/', ' ', $message->body), 90),
            ], collapse: true);
        }
    }

    public function addedToGroup(Conversation $conversation, User $added, User $by): void
    {
        $this->push($added, $conversation, 'added', [
            'sender' => $by->name,
            'preview' => "{$by->name} added you to {$conversation->name}.",
        ]);
    }

    public function removedFromGroup(Conversation $conversation, User $removed): void
    {
        $this->push($removed, $conversation, 'removed', [
            'sender' => null,
            'preview' => "You were removed from {$conversation->name}.",
        ]);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function push(User $recipient, Conversation $conversation, string $kind, array $extra, bool $collapse = false): void
    {
        $payload = [
            'kind' => $kind,
            'conversation_id' => $conversation->id,
            'title' => $conversation->isGroup() ? $conversation->name : ($extra['sender'] ?? 'Direct message'),
            'count' => 1,
            // A removed person can no longer open the chat, so no link.
            'url' => $kind === 'removed' ? null : "/team-chat/{$conversation->id}",
            ...$extra,
        ];

        $existing = $collapse ? $this->findUnread($recipient, $conversation->id, $kind) : null;

        if ($existing) {
            $payload['count'] = ($existing->data['count'] ?? 1) + 1;
            $existing->forceFill(['data' => $payload, 'updated_at' => now()])->save();
            $notification = $existing;
        } else {
            $recipient->notify(new ChatActivity($payload));
            $notification = $recipient->notifications()->latest()->first();
        }

        Realtime::send(new ChatNotificationCreated($recipient->id, [
            'id' => $notification->id,
            'data' => $payload,
            'read' => false,
            'created_at' => $notification->updated_at?->toIso8601String(),
        ]));
    }

    private function findUnread(User $recipient, int $conversationId, string $kind): ?DatabaseNotification
    {
        return $recipient->unreadNotifications()
            ->latest()
            ->limit(50)
            ->get()
            ->first(fn (DatabaseNotification $n) => ($n->data['conversation_id'] ?? null) === $conversationId
                && ($n->data['kind'] ?? null) === $kind);
    }

    /** Opening a conversation reads its notifications too. */
    public function markConversationRead(User $user, int $conversationId): void
    {
        $user->unreadNotifications()
            ->get()
            ->filter(fn (DatabaseNotification $n) => ($n->data['conversation_id'] ?? null) === $conversationId)
            ->each->markAsRead();
    }
}
