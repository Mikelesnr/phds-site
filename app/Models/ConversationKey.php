<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One member's sealed copy of a conversation key. Opaque to the server. */
class ConversationKey extends Model
{
    protected $guarded = [];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
