<?php

namespace App\Http\Controllers;

use App\Models\Blog;
use App\Services\Chatbot\ChatbotUnavailable;
use App\Services\Chatbot\GeminiClient;
use App\Services\Chatbot\ScopeGate;
use App\Services\Chatbot\SiteKnowledge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ChatbotController extends Controller
{
    public function __construct(
        private readonly GeminiClient $gemini,
        private readonly SiteKnowledge $knowledge,
        private readonly ScopeGate $gate,
    ) {}

    public function ask(Request $request): JsonResponse
    {
        $max = config('chatbot.max_message_chars');

        $data = $request->validate([
            'message' => ['required', 'string', "max:{$max}"],
            'history' => ['nullable', 'array', 'max:20'],
            'history.*.role' => ['required', 'in:user,assistant'],
            'history.*.content' => ['required', 'string', 'max:2000'],
        ]);

        $message = trim($data['message']);
        $history = $this->cleanHistory($data['history'] ?? []);

        if ($message === '') {
            return response()->json(['reply' => 'Please type a question.', 'blocked' => true], 422);
        }

        if (! config('chatbot.enabled') || ! $this->gemini->isConfigured()) {
            return response()->json([
                'reply' => 'The assistant is not available right now. Please use [Contact us](/contact) and the team will help.',
                'blocked' => true,
            ], 503);
        }

        // 1. Off-topic and injection attempts never reach the model.
        $verdict = $this->gate->verdict($message, $history !== []);

        if ($verdict !== null) {
            return response()->json(['reply' => ScopeGate::REFUSAL, 'blocked' => true]);
        }

        // 2. Spending caps: per visitor per day, then overall per day.
        if ($this->overLimit('ip:'.$request->ip(), config('chatbot.per_ip_daily_limit'))
            || $this->overLimit('all', config('chatbot.daily_limit'))) {
            return response()->json([
                'reply' => 'The assistant has reached its limit for today. Please try again tomorrow or use [Contact us](/contact).',
                'blocked' => true,
            ], 429);
        }

        try {
            $reply = $this->gemini->generate($this->knowledge->systemPrompt(), $history, $message);
        } catch (ChatbotUnavailable) {
            return response()->json([
                'reply' => 'Sorry, I could not answer just now. Please try again in a moment or use [Contact us](/contact).',
                'blocked' => true,
            ], 502);
        }

        return response()->json(['reply' => $reply, 'blocked' => false]);
    }

    /** Latest published posts for the "News" tab. */
    public function news(): JsonResponse
    {
        $posts = Blog::query()
            ->published()
            ->latest('published_at')
            ->limit(5)
            ->get()
            ->map(fn (Blog $blog) => [
                'id' => $blog->id,
                'title' => $blog->title,
                'excerpt' => $blog->excerpt,
                'date' => $blog->published_at?->format('j M Y'),
                'cover' => $blog->cover(),
            ]);

        return response()->json(['posts' => $posts]);
    }

    /**
     * Keep only the last few turns, trim them, and merge neighbours with the
     * same role so the conversation always alternates and starts with the visitor.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @return list<array{role: string, content: string}>
     */
    private function cleanHistory(array $history): array
    {
        $clean = [];

        foreach (array_slice($history, -config('chatbot.max_history_messages')) as $turn) {
            $content = mb_substr(trim($turn['content']), 0, 1200);

            if ($content === '') {
                continue;
            }

            $last = count($clean) - 1;

            if ($last >= 0 && $clean[$last]['role'] === $turn['role']) {
                $clean[$last]['content'] .= "\n".$content;
            } else {
                $clean[] = ['role' => $turn['role'], 'content' => $content];
            }
        }

        while ($clean !== [] && $clean[0]['role'] !== 'user') {
            array_shift($clean);
        }

        return $clean;
    }

    private function overLimit(string $bucket, int $limit): bool
    {
        $key = 'chatbot:'.now()->format('Y-m-d').':'.$bucket;

        Cache::add($key, 0, now()->endOfDay());

        return Cache::increment($key) > $limit;
    }
}
