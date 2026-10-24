<?php

namespace Tests\Unit;

use App\Support\VideoEmbed;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class VideoEmbedTest extends TestCase
{
    /**
     * @return array<string, array{string, string|null}>
     */
    public static function links(): array
    {
        return [
            'youtube watch' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'],
            'youtube short link' => ['https://youtu.be/dQw4w9WgXcQ?t=10', 'youtube:dQw4w9WgXcQ'],
            'youtube embed' => ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'],
            'youtube shorts' => ['https://youtube.com/shorts/dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'],
            'vimeo' => ['https://vimeo.com/76979871', 'vimeo:76979871'],
            'vimeo unlisted' => ['https://vimeo.com/76979871/abcdef1234', 'vimeo:76979871'],
            'vimeo player' => ['https://player.vimeo.com/video/76979871?h=abc123', 'vimeo:76979871'],
            'other site' => ['https://evil.com/watch?v=dQw4w9WgXcQ', null],
            'lookalike host' => ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', null],
            'javascript scheme' => ['javascript:alert(1)', null],
            'bad youtube id' => ['https://youtube.com/watch?v=short', null],
            'not a url' => ['not a url', null],
        ];
    }

    #[DataProvider('links')]
    public function test_it_only_accepts_youtube_and_vimeo(string $url, ?string $expected): void
    {
        $result = VideoEmbed::parse($url);

        $this->assertSame($expected, $result ? $result['provider'].':'.$result['id'] : null);
    }

    public function test_embed_urls_are_rebuilt_from_the_id(): void
    {
        $result = VideoEmbed::parse('https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1&x=<script>');

        $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', $result['embed']);
    }
}
