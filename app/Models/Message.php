<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['body'])]
class Message extends Model
{
    use SoftDeletes;

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
     * Shape sent to the browser. A deleted message keeps its place in the
     * thread but its text never leaves the server.
     *
     * @return array<string, mixed>
     */
    public function toChatArray(): array
    {
        $deleted = $this->trashed();

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'user_id' => $this->user_id,
            'author' => $this->author?->name ?? 'Former member',
            'body' => $deleted ? null : $this->body,
            'deleted' => $deleted,
            'edited' => $this->edited_at !== null && ! $deleted,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
