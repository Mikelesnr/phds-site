<?php

return [

    // Longest message, in characters.
    'message_max' => 4000,

    // How often the browser checks for news when websockets are not available.
    'poll_seconds' => (int) env('CHAT_POLL_SECONDS', 6),

    // Handed to the browser at run time, so nothing is baked into the build.
    // Realtime is on only when Reverb is the active broadcaster and a key is set.
    'client' => [
        'enabled' => env('BROADCAST_CONNECTION') === 'reverb' && filled(env('REVERB_APP_KEY')),
        'key' => env('REVERB_APP_KEY'),
        'host' => env('REVERB_HOST'),
        'port' => (int) env('REVERB_PORT', 443),
        'scheme' => env('REVERB_SCHEME', 'https'),
    ],
];
