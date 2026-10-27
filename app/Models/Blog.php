<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Support\VideoEmbed;
use Database\Factories\BlogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable(['title', 'excerpt', 'body', 'images', 'videos'])]
class Blog extends Model
{
    /** @use HasFactory<BlogFactory> */
    use HasFactory, HasUuids;

    /** How many featured posts the home page shows. */
    public const HOME_FEATURED_LIMIT = 3;

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'videos' => 'array',
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Blog $blog) {
            $blog->slug ??= static::uniqueSlug($blog->title);
        });
    }

    public static function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        $suffix = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->lte(now());
    }

    /**
     * Posts shown in the home page "featured" section.
     *
     * @return list<array<string, mixed>>
     */
    public static function featuredForHome(): array
    {
        return static::published()
            ->featured()
            ->with('author:id,name')
            ->latest('published_at')
            ->limit(self::HOME_FEATURED_LIMIT)
            ->get()
            ->map(fn (Blog $blog) => $blog->toPublicArray())
            ->all();
    }

    /**
     * Playable embeds built from the saved video links. Unrecognised links are skipped.
     *
     * @return list<array{provider: string, id: string, embed: string, thumbnail: string|null, url: string}>
     */
    public function videoEmbeds(): array
    {
        return collect($this->videos ?? [])
            ->map(fn ($url) => is_string($url) ? VideoEmbed::parse($url) : null)
            ->filter()
            ->values()
            ->all();
    }

    /** Card image: first picture, otherwise a YouTube thumbnail, otherwise nothing. */
    public function cover(): ?string
    {
        $first = collect($this->images ?? [])->first();

        if (is_string($first) && $first !== '') {
            return $first;
        }

        return collect($this->videoEmbeds())->pluck('thumbnail')->filter()->first();
    }

    /**
     * Shape sent to visitors. Nothing private (like author email) is included.
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'body' => $this->body,
            'is_featured' => $this->is_featured,
            'published_label' => $this->published_at?->format('j F Y'),
            'author' => $this->author?->name,
            'cover' => $this->cover(),
            'images' => array_values($this->images ?? []),
            'videos' => $this->videoEmbeds(),
        ];
    }
}
