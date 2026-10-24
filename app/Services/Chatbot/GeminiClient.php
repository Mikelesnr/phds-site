<?php

namespace App\Services\Chatbot;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GeminiClient
{
    public function isConfigured(): bool
    {
        return filled(config('chatbot.api_key'));
    }

    /**
     * @param  list<array{role: string, content: string}>  $history  earlier turns, oldest first
     *
     * @throws ChatbotUnavailable
     */
    public function generate(string $system, array $history, string $message): string
    {
        $model = config('chatbot.model');

        $generation = [
            'maxOutputTokens' => config('chatbot.max_output_tokens'),
            'temperature' => config('chatbot.temperature'),
            'topP' => 0.9,
        ];

        // Gemini 2.5 Flash "thinks" by default, and thinking tokens count against
        // the output budget and the bill. Short factual answers do not need it.
        if (str_starts_with($model, 'gemini-2.5') && ! str_contains($model, 'pro')) {
            $generation['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $contents = collect($history)
            ->map(fn (array $turn) => [
                'role' => $turn['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $turn['content']]],
            ])
            ->push(['role' => 'user', 'parts' => [['text' => $message]]])
            ->values()
            ->all();

        try {
            $response = Http::withHeaders(['x-goog-api-key' => config('chatbot.api_key')])
                ->acceptJson()
                ->timeout(config('chatbot.timeout'))
                ->post(config('chatbot.endpoint')."/models/{$model}:generateContent", [
                    'systemInstruction' => ['parts' => [['text' => $system]]],
                    'contents' => $contents,
                    'generationConfig' => $generation,
                ]);
        } catch (Throwable $e) {
            Log::warning('Chatbot request failed', ['error' => $e->getMessage()]);

            throw new ChatbotUnavailable('Could not reach Gemini.', previous: $e);
        }

        if ($response->failed()) {
            Log::warning('Chatbot Gemini error', [
                'status' => $response->status(),
                'body' => Str::limit($response->body(), 400),
            ]);

            throw new ChatbotUnavailable('Gemini returned an error.');
        }

        $text = collect($response->json('candidates.0.content.parts', []))
            ->pluck('text')
            ->filter()
            ->implode('');

        if (trim($text) === '') {
            Log::info('Chatbot got an empty answer', [
                'finish' => $response->json('candidates.0.finishReason'),
                'blocked' => $response->json('promptFeedback.blockReason'),
            ]);

            throw new ChatbotUnavailable('Gemini returned no text.');
        }

        Log::debug('Chatbot tokens', ['total' => $response->json('usageMetadata.totalTokenCount')]);

        return trim($text);
    }
}
