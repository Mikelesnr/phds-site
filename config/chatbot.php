<?php

/*
|--------------------------------------------------------------------------
| Website chatbot (Gemini)
|--------------------------------------------------------------------------
|
| The key stays on the server. The browser only talks to this app, never to
| Google. Every limit below exists to keep token spend predictable.
|
*/

return [

    'enabled' => (bool) env('CHATBOT_ENABLED', true),

    'api_key' => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    'endpoint' => 'https://generativelanguage.googleapis.com/v1beta',
    'timeout' => 20,

    // Per answer
    'max_output_tokens' => (int) env('CHATBOT_MAX_OUTPUT_TOKENS', 450),
    'temperature' => 0.2,

    // Per question
    'max_message_chars' => 500,
    'max_history_messages' => 6,

    // Per visitor and overall. Blocked off-topic questions cost nothing.
    'per_minute_limit' => (int) env('CHATBOT_PER_MINUTE', 8),
    'per_ip_daily_limit' => (int) env('CHATBOT_PER_IP_DAILY', 40),
    'daily_limit' => (int) env('CHATBOT_DAILY_LIMIT', 500),

    // What the model is allowed to know
    'knowledge' => [
        'blog_limit' => 25,
        'blog_chars' => 700,
        'max_chars' => 60000,
        'cache_minutes' => 5,
    ],
];
