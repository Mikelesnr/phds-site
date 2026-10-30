<?php

/*
|--------------------------------------------------------------------------
| M-Pesa (Safaricom Daraja) donations
|--------------------------------------------------------------------------
|
| Uses M-Pesa Express (STK push): the donor types an amount and a phone number,
| gets a prompt on their phone, and approves it with their PIN. Safaricom then
| calls our callback URL with the result.
|
| Start in the sandbox (MPESA_ENV=sandbox). Safaricom has to reach the callback
| URL, so locally use a tunnel (ngrok, cloudflared) and set MPESA_CALLBACK_BASE.
|
*/

return [

    'env' => env('MPESA_ENV', 'sandbox'), // sandbox | production
    'base_url' => env('MPESA_BASE_URL'),  // override only for a test double

    'consumer_key' => env('MPESA_CONSUMER_KEY'),
    'consumer_secret' => env('MPESA_CONSUMER_SECRET'),

    // The paybill or till that receives the money, and its Lipa na M-Pesa Online passkey.
    'shortcode' => env('MPESA_SHORTCODE'),
    'passkey' => env('MPESA_PASSKEY'),
    // CustomerPayBillOnline for a paybill, CustomerBuyGoodsOnline for a till.
    'transaction_type' => env('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
    // For a till, PartyB is the till number. For a paybill it is the shortcode.
    'party_b' => env('MPESA_PARTY_B'),
    'account_reference' => env('MPESA_ACCOUNT_REFERENCE', 'PHDS'),

    // Part of the callback address, so only someone who knows it can post a "payment".
    'callback_token' => env('MPESA_CALLBACK_TOKEN'),
    // Public address Safaricom can reach. Defaults to the site's own address.
    'callback_base' => env('MPESA_CALLBACK_BASE', env('APP_URL')),
    // Optional comma separated list of Safaricom IPs allowed to call back.
    'callback_ips' => array_filter(array_map('trim', explode(',', (string) env('MPESA_CALLBACK_IPS', '')))),

    'timeout' => 15,

    // Whole Kenyan shillings.
    'min_amount' => (int) env('DONATION_MIN_AMOUNT', 10),
    'max_amount' => (int) env('DONATION_MAX_AMOUNT', 150000),
    'quick_amounts' => [500, 1000, 2500, 5000],

    // How long a prompt may stay unanswered before we call it expired.
    'expiry_minutes' => 3,
    // Stops anyone using the form to send prompts to someone else's phone again and again.
    'max_per_phone_per_hour' => 5,
];
