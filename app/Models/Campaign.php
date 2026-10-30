<?php

namespace App\Models;

use App\Enums\DonationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory, HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'goal_amount' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function blog(): BelongsTo
    {
        return $this->belongsTo(Blog::class);
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    /** Open to donations right now: switched on and inside its dates. */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }

    public function isOpen(): bool
    {
        return $this->is_active
            && ($this->starts_at === null || $this->starts_at->lte(now()))
            && ($this->ends_at === null || $this->ends_at->gte(now()));
    }

    /** Only completed payments count, at the amount actually paid. */
    public function raised(): int
    {
        return (int) $this->donations()
            ->where('status', DonationStatus::Succeeded->value)
            ->selectRaw('coalesce(sum(coalesce(paid_amount, amount)), 0) as total')
            ->value('total');
    }

    public function donorCount(): int
    {
        return $this->donations()->where('status', DonationStatus::Succeeded->value)->count();
    }

    /** @return array<string, mixed> */
    public function toPublicArray(bool $withStory = false): array
    {
        $raised = $this->raised();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'goal_amount' => $this->goal_amount,
            'raised' => $raised,
            'donors' => $this->donorCount(),
            'percent' => $this->goal_amount ? min(100, (int) floor($raised / $this->goal_amount * 100)) : null,
            'ends_label' => $this->ends_at?->format('j F Y'),
            'cover' => $this->blog?->cover(),
            'story' => $withStory ? $this->blog?->toPublicArray() : null,
        ];
    }
}
