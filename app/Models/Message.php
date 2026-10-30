<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use HasUuids, SoftDeletes;

    protected static function booted(): void
    {
        // Next number in this conversation. A clash (two sent at once) is retried by the caller.
        static::creating(function (Message $message) {
            if ($message->seq === null) {
                $message->seq = (int) static::withTrashed()
                    ->where('conversation_id', $message->conversation_id)
                    ->max('seq') + 1;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Shape sent to the browser. The text is encrypted, and for a deleted
     * message even the ciphertext is gone: only its place in the thread stays.
     *
     * @return array<string, mixed>
     */
    public function toChatArray(): array
    {
        $deleted = $this->trashed();

        return [
            'id' => $this->id,
            'seq' => $this->seq,
            'conversation_id' => $this->conversation_id,
            'user_id' => $this->user_id,
            'sender_id' => $this->sender_id,
            'author' => $this->author?->name ?? 'Former member',
            'ciphertext' => $deleted ? null : $this->ciphertext,
            'iv' => $deleted ? null : $this->iv,
            'key_version' => $this->key_version,
            'deleted' => $deleted,
            'edited' => $this->edited_at !== null && ! $deleted,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /** Delete for everyone and wipe the encrypted text as well. */
    public function redact(): void
    {
        $this->forceFill(['ciphertext' => '', 'iv' => ''])->save();
        $this->delete();
    }
}
