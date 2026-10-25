<?php

return [

    /*
    | "null" keeps the chat working without websockets: the browser polls.
    | Set BROADCAST_CONNECTION=reverb once Reverb is installed and running.
    */
    'default' => env('BROADCAST_CONNECTION', 'null'),

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            // Where Laravel publishes events. Inside one container this is the
            // local Reverb server, not the public address the browser uses.
            'options' => [
                'host' => env('REVERB_PUBLISH_HOST', env('REVERB_HOST')),
                'port' => env('REVERB_PUBLISH_PORT', env('REVERB_PORT', 443)),
                'scheme' => env('REVERB_PUBLISH_SCHEME', env('REVERB_SCHEME', 'https')),
                'useTLS' => env('REVERB_PUBLISH_SCHEME', env('REVERB_SCHEME', 'https')) === 'https',
            ],
            'client_options' => [],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
