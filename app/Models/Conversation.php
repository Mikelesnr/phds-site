<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

#[Fillable(['name', 'description'])]
class Conversation extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'type' => ConversationType::class,
            'visibility' => ConversationVisibility::class,
        ];
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(ConversationMember::class)
            ->withPivot(['id', 'role', 'last_read_at'])
            ->withTimestamps();
    }

    /** Every message in the conversation, oldest first. Loaded whole into the chat. */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->oldest('seq');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany('seq');
    }

    public function keys(): HasMany
    {
        return $this->hasMany(ConversationKey::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDirect(): bool
    {
        return $this->type === ConversationType::Direct;
    }

    public function isGroup(): bool
    {
        return $this->type === ConversationType::Group;
    }

    public function isOpen(): bool
    {
        return $this->isGroup() && $this->visibility === ConversationVisibility::Open;
    }

    public function hasMember(User $user): bool
    {
        return $this->members()->whereKey($user->getKey())->exists();
    }

    public function isModeratedBy(User $user): bool
    {
        return $this->isGroup()
            && $this->members()
                ->whereKey($user->getKey())
                ->wherePivot('role', MemberRole::Moderator->value)
                ->exists();
    }

    /**
     * The one direct chat between two people. Created on first use.
     */
    public static function directBetween(User $a, User $b): self
    {
        $ids = collect([$a->id, $b->id])->sort()->values();
        $key = $ids->implode(':');

        return DB::transaction(function () use ($key, $a, $b) {
            $conversation = static::query()->where('direct_key', $key)->first();

            if ($conversation) {
                return $conversation;
            }

            $conversation = new static;
            $conversation->type = ConversationType::Direct;
            $conversation->visibility = ConversationVisibility::Private;
            $conversation->direct_key = $key;
            $conversation->created_by = $a->id;
            $conversation->save();

            $conversation->members()->attach([
                $a->id => ['role' => MemberRole::Member->value],
                $b->id => ['role' => MemberRole::Member->value],
            ]);

            return $conversation;
        });
    }

    /** What a given person should see as the chat's title. */
    public function titleFor(User $viewer): string
    {
        if ($this->isGroup()) {
            return $this->name ?: 'Group';
        }

        $other = $this->members->firstWhere('id', '!=', $viewer->id);

        return $other?->name ?? 'Former member';
    }
}
