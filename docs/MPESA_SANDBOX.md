# Testing M-Pesa donations in the sandbox

## 1. Set the environment

Add these to your `.env`. The values come from your Daraja sandbox app.

```
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your-sandbox-consumer-key
MPESA_CONSUMER_SECRET=your-sandbox-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-sandbox-passkey
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_TOKEN=pick-a-long-random-string
MPESA_CALLBACK_BASE=https://your-ngrok-address.ngrok-free.app
```

Sandbox shortcode `174379` and its passkey are the public ones in Safaricom's
documentation. Use your own app's values if they differ.

## 2. Open a public tunnel

Safaricom must reach the callback address, so the site has to be public:

```
ngrok http 8000
```

Copy the `https://…ngrok-free.app` address into `MPESA_CALLBACK_BASE`, then run
`php artisan config:clear`. Restart `php artisan serve` if it is running.

## 3. Start the site and the reconcile job

```
php artisan serve --host=127.0.0.1 --port=8000
php artisan schedule:work
```

`schedule:work` settles donations whose callback never arrives.

## 4. Make a test donation

Open `/donate`, enter 10 (or any amount), and use a sandbox test number such as
`254708374149`. Submit, then check the phone prompt in the sandbox simulator,
or enter the sandbox PIN.

## 5. What to send me

If anything fails, send the output of these three things. They are what I need
to fix the real behaviour:

1. The Laravel log: `storage/logs/laravel.log`, the lines around the failure.
2. The donation row: `php artisan tinker --execute="dump(App\Models\Donation::latest('created_at')->first()->toArray());"`
3. The callback rows: `php artisan tinker --execute="dump(App\Models\MpesaCallback::latest()->take(3)->get()->toArray());"`

For an M-Pesa error, also paste the exact JSON body Daraja returned.
