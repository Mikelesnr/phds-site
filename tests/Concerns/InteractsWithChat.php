<?php

namespace Tests\Concerns;

use App\Models\Conversation;
use App\Models\ConversationKey;
use App\Models\User;
use Illuminate\Support\Str;

/** Test helpers for the end-to-end encrypted chat. The server only ever sees opaque text. */
trait InteractsWithChat
{
    /** @return array{id: string, ciphertext: string, iv: string, key_version: int} */
    protected function cipher(string $text = 'hello', int $version = 1): array
    {
        return [
            'id' => (string) Str::uuid(),
            'ciphertext' => base64_encode($text),
            'iv' => base64_encode('0123456789ab'),
            'key_version' => $version,
        ];
    }

    /** Give every current member a sealed copy of the conversation key. */
    protected function keyed(Conversation $conversation, int $version = 1): Conversation
    {
        foreach ($conversation->members()->pluck('users.id') as $userId) {
            ConversationKey::query()->firstOrCreate(
                ['conversation_id' => $conversation->id, 'user_id' => $userId, 'key_version' => $version],
                ['wrapped_key' => 'sealed-for-'.$userId],
            );
        }

        return $conversation;
    }

    protected function dm(User $a, User $b): Conversation
    {
        return $this->keyed(Conversation::directBetween($a, $b));
    }
}
