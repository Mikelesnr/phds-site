<?php

namespace App\Services\Chatbot;

use Illuminate\Support\Str;

/**
 * A cheap check that runs before any tokens are spent.
 *
 * It is a cost saver, not the only guard: the system prompt still refuses
 * anything that slips through. It lets a question through when it shares a
 * meaningful word with the site content, is a greeting, or is a short
 * follow-up inside an ongoing chat.
 */
class ScopeGate
{
    public const OFF_TOPIC = 'off_topic';

    public const INJECTION = 'injection';

    public const REFUSAL = 'I can only help with questions about PHDS, our work around Lake Victoria and our blog posts. You could ask about our focus areas, where we work or how to partner with us. For anything else, please use [Contact us](/contact).';

    /** Words that appear everywhere and say nothing about the topic. */
    private const COMMON = [
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'yours', 'can', 'could', 'would', 'should', 'will',
        'with', 'from', 'that', 'this', 'these', 'those', 'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how',
        'does', 'did', 'has', 'have', 'had', 'was', 'were', 'been', 'being', 'about', 'into', 'than', 'then', 'them',
        'they', 'their', 'there', 'here', 'also', 'any', 'all', 'some', 'more', 'most', 'much', 'many', 'very', 'just',
        'like', 'want', 'need', 'tell', 'give', 'show', 'know', 'make', 'made', 'get', 'got', 'let', 'say', 'said',
        'please', 'help', 'work', 'works', 'working', 'people', 'thing', 'things', 'something', 'anything', 'write',
        'code', 'best', 'good', 'new', 'one', 'two', 'out', 'its', 'our', 'own', 'use', 'used', 'using', 'every',
        'explain', 'describe', 'list', 'give', 'find', 'look', 'really', 'only', 'other', 'over', 'such', 'time',
        'world', 'today', 'tonight', 'now', 'current', 'currently', 'price', 'prices', 'cost', 'costs', 'year', 'years',
        'day', 'days', 'week', 'month', 'life', 'live', 'news', 'latest', 'top', 'famous', 'popular', 'win', 'won',
        'play', 'game', 'first', 'last', 'next', 'big', 'biggest', 'high', 'low', 'real', 'true', 'right', 'free',
    ];

    public function __construct(private SiteKnowledge $knowledge) {}

    /**
     * @return string|null null when the question may go to the model, otherwise the reason it was stopped
     */
    public function verdict(string $message, bool $hasHistory): ?string
    {
        $text = Str::lower(Str::ascii(trim($message)));

        if (preg_match(
            '/ignore (?:all |any |the |your )?(?:previous|above|prior|earlier|system)? ?(?:instructions|rules|prompts?)|system prompt|developer message|you are now|pretend (?:to be|you)|jailbreak|reveal (?:your|the) (?:instructions|prompt|rules)|\bdan mode\b|act as (?:a|an|if)\b/',
            $text,
        )) {
            return self::INJECTION;
        }

        // Greetings and thanks
        if (preg_match('/^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening)|thanks?|thank you|help|menu|start)\b[\s!.,?]*$/', $text)) {
            return null;
        }

        // Direct questions about the organisation itself
        if (preg_match('/\b(?:phds|stewards|organi[sz]ation|ngo|charity)\b/', $text)
            || preg_match('/\b(?:what|where|who|how|why|when)\b.*\b(?:you|your)\b/', $text)) {
            return null;
        }

        $vocabulary = $this->knowledge->vocabulary();

        preg_match_all('/[a-z][a-z-]{2,}/', $text, $matches);
        $meaningful = array_diff(array_unique($matches[0]), self::COMMON);

        foreach ($meaningful as $word) {
            if (isset($vocabulary[$word]) || isset($vocabulary[rtrim($word, 's')])) {
                return null;
            }
        }

        // Short follow-ups inside an ongoing conversation
        if ($hasHistory
            && str_word_count($text) <= 6
            && preg_match('/^(?:and|so|why|how|what about|tell me more|more|go on|really|ok|okay|yes|no|sure|can you (?:explain|say more|expand))\b/', $text)) {
            return null;
        }

        return self::OFF_TOPIC;
    }
}
