<?php

namespace App\Http\Requests;

use App\Models\Blog;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => Str::slug((string) ($this->input('slug') ?: $this->input('title'))),
            'blog_id' => $this->input('blog_id') ?: null,
            'goal_amount' => $this->input('goal_amount') === '' ? null : $this->input('goal_amount'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:120', Rule::unique('campaigns', 'slug')->ignore($this->route('campaign'))],
            'summary' => ['required', 'string', 'max:600'],
            'goal_amount' => ['nullable', 'integer', 'min:1', 'max:1000000000'],
            // The story is a blog post, and a draft one would not be visible to donors.
            'blog_id' => [
                'nullable', 'uuid', 'exists:blogs,id',
                function (string $attribute, mixed $value, Closure $fail) {
                    if ($value && ! Blog::query()->published()->whereKey($value)->exists()) {
                        $fail('Choose a published blog post. Drafts and scheduled posts cannot be shown to donors yet.');
                    }
                },
            ],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ];
    }
}
