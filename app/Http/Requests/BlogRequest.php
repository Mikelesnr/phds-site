<?php

namespace App\Http\Requests;

use App\Support\VideoEmbed;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class BlogRequest extends FormRequest
{
    /**
     * Role checks live in BlogController::verify(), so any signed-in
     * request that reaches validation has already been verified.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:160'],
            'excerpt' => ['required', 'string', 'max:300'],
            'body' => ['required', 'string', 'max:20000'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => [
                'required',
                'string',
                'max:2048',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! is_string($value) || ! self::isAllowedImage($value)) {
                        $fail('Use a link starting with https:// or a site picture such as /images/photo.jpg.');
                    }
                },
            ],
            'videos' => ['nullable', 'array', 'max:5'],
            'videos.*' => [
                'required',
                'string',
                'max:2048',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! is_string($value) || VideoEmbed::parse($value) === null) {
                        $fail('Use a YouTube or Vimeo video link.');
                    }
                },
            ],
            'publish' => ['boolean'],
            'is_featured' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'images.*.required' => 'Remove empty picture rows or paste a link.',
            'videos.*.required' => 'Remove empty video rows or paste a link.',
        ];
    }

    /**
     * Pictures hosted elsewhere must be https links. Pictures that ship with
     * the site (such as the seeded posts) are plain paths like /images/a.jpg.
     */
    private static function isAllowedImage(string $value): bool
    {
        if (str_starts_with($value, 'https://')) {
            return filter_var($value, FILTER_VALIDATE_URL) !== false;
        }

        return preg_match('#^/(?!/)[A-Za-z0-9._~%/-]+$#', $value) === 1
            && ! str_contains($value, '..');
    }
}
