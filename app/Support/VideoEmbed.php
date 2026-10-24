<?php

namespace App\Support;

/**
 * Turns a YouTube or Vimeo link into a safe embed.
 *
 * Embed URLs are rebuilt from the parsed video id, never copied from user
 * input, so only these two providers can ever end up inside an iframe.
 */
final class VideoEmbed
{
    /**
     * @return array{provider: string, id: string, embed: string, thumbnail: string|null, url: string}|null
     */
    public static function parse(string $url): ?array
    {
        $url = trim($url);
        $parts = parse_url($url);

        if ($parts === false || ! isset($parts['host'])) {
            return null;
        }

        if (! in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true)) {
            return null;
        }

        $host = strtolower((string) preg_replace('/^www\./i', '', $parts['host']));
        $path = $parts['path'] ?? '';
        parse_str($parts['query'] ?? '', $query);

        $youtubeId = null;

        if (in_array($host, ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'], true)) {
            if ($path === '/watch') {
                $youtubeId = is_string($query['v'] ?? null) ? $query['v'] : null;
            } elseif (preg_match('#^/(?:embed|shorts|live|v)/([A-Za-z0-9_-]{11})(?:/|$)#', $path, $match)) {
                $youtubeId = $match[1];
            }
        } elseif ($host === 'youtu.be') {
            $youtubeId = explode('/', ltrim($path, '/'))[0];
        }

        if ($youtubeId !== null) {
            return self::youtube($youtubeId, $url);
        }

        if ($host === 'player.vimeo.com' && preg_match('#^/video/(\d+)#', $path, $match)) {
            $hash = is_string($query['h'] ?? null) ? $query['h'] : null;

            return self::vimeo($match[1], $hash, $url);
        }

        if ($host === 'vimeo.com'
            && preg_match(
                '#^/(?:channels/[^/]+/|groups/[^/]+/videos/|album/\d+/video/|showcase/\d+/video/)?(\d+)(?:/([A-Za-z0-9]+))?/?$#',
                $path,
                $match,
            )) {
            return self::vimeo($match[1], $match[2] ?? ($query['h'] ?? null), $url);
        }

        return null;
    }

    /**
     * @return array{provider: string, id: string, embed: string, thumbnail: string|null, url: string}|null
     */
    private static function youtube(string $id, string $url): ?array
    {
        if (! preg_match('/^[A-Za-z0-9_-]{11}$/', $id)) {
            return null;
        }

        return [
            'provider' => 'youtube',
            'id' => $id,
            'embed' => "https://www.youtube-nocookie.com/embed/{$id}",
            'thumbnail' => "https://i.ytimg.com/vi/{$id}/hqdefault.jpg",
            'url' => $url,
        ];
    }

    /**
     * @return array{provider: string, id: string, embed: string, thumbnail: string|null, url: string}
     */
    private static function vimeo(string $id, mixed $hash, string $url): array
    {
        $embed = "https://player.vimeo.com/video/{$id}";

        if (is_string($hash) && preg_match('/^[A-Za-z0-9]+$/', $hash)) {
            $embed .= "?h={$hash}";
        }

        return [
            'provider' => 'vimeo',
            'id' => $id,
            'embed' => $embed,
            'thumbnail' => null,
            'url' => $url,
        ];
    }
}
