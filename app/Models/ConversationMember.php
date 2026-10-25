<?php

namespace App\Models;

use App\Enums\MemberRole;
use Illuminate\Database\Eloquent\Relations\Pivot;

/** Pivot row between a conversation and a person, with their role and read marker. */
class ConversationMember extends Pivot
{
    protected $table = 'conversation_user';

    public $incrementing = true;

    protected function casts(): array
    {
        return [
            'role' => MemberRole::class,
            'last_read_at' => 'datetime',
        ];
    }
}
