<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A person's chat identity. Only ever holds a public key and a locked private key. */
class UserKey extends Model
{
    use HasUuids;

    protected $fillable = ['public_key', 'encrypted_private_key'];

    protected $hidden = ['encrypted_private_key'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
