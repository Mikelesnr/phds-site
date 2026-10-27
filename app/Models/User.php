<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuids, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            // Stored as a string, guarded by the enum.
            'role' => UserRole::class,
        ];
    }

    /**
     * Whether the user holds any of the given roles.
     */
    public function hasRole(UserRole ...$roles): bool
    {
        return $this->role !== null && in_array($this->role, $roles, true);
    }

    public function blogs(): HasMany
    {
        return $this->hasMany(Blog::class);
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class)
            ->using(ConversationMember::class)
            ->withPivot(['id', 'role', 'last_read_at'])
            ->withTimestamps();
    }

    public function chatKey(): HasOne
    {
        return $this->hasOne(UserKey::class);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin);
    }
}
