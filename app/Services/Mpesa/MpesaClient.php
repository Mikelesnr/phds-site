<?php

namespace App\Services\Mpesa;

use App\Models\Donation;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class MpesaClient
{
    public function isConfigured(): bool
    {
        return filled(config('mpesa.consumer_key'))
            && filled(config('mpesa.consumer_secret'))
            && filled(config('mpesa.shortcode'))
            && filled(config('mpesa.passkey'))
            && filled(config('mpesa.callback_token'))
            && filled(config('mpesa.callback_base'));
    }

    /** Ask the donor's phone for payment. Returns Safaricom's acknowledgement. */
    public function stkPush(Donation $donation): array
    {
        $this->ensureConfigured();

        $timestamp = now('Africa/Nairobi')->format('YmdHis');
        $body = [
            'BusinessShortCode' => config('mpesa.shortcode'),
            'Password' => $this->password($timestamp),
            'Timestamp' => $timestamp,
            'TransactionType' => config('mpesa.transaction_type'),
            'Amount' => $donation->amount,
            'PartyA' => $donation->phone,
            'PartyB' => config('mpesa.party_b') ?: config('mpesa.shortcode'),
            'PhoneNumber' => $donation->phone,
            'CallBackURL' => $this->callbackUrl($donation),
            'AccountReference' => substr((string) config('mpesa.account_reference'), 0, 12),
            'TransactionDesc' => 'Donation',
        ];

        // From here on, a missing answer is ambiguous: the prompt may already be on its way.
        try {
            $response = $this->send($this->token(), '/mpesa/stkpush/v1/processrequest', $body);

            if ($response->status() === 401) {
                $response = $this->send($this->token(fresh: true), '/mpesa/stkpush/v1/processrequest', $body);
            }
        } catch (ConnectionException $e) {
            throw new MpesaUnreachable('No answer from M-Pesa.', previous: $e);
        }

        if (in_array($response->status(), [502, 503, 504], true)) {
            throw new MpesaUnreachable("M-Pesa gateway error {$response->status()}.");
        }

        $json = $response->json() ?? [];

        if (
            $response->successful()
            && (string) ($json['ResponseCode'] ?? '') === '0'
            && filled($json['CheckoutRequestID'] ?? null)
        ) {
            return $json;
        }

        throw new MpesaRejected((string) ($json['errorMessage'] ?? $json['ResponseDescription'] ?? 'M-Pesa refused the request.'));
    }

    /**
     * Ask M-Pesa how a prompt ended, for when the callback never arrived.
     *
     * @return array{code: int|null, desc: string, processing: bool}
     */
    public function stkQuery(Donation $donation): array
    {
        $this->ensureConfigured();

        $timestamp = now('Africa/Nairobi')->format('YmdHis');

        try {
            $response = $this->send($this->token(), '/mpesa/stkpushquery/v1/query', [
                'BusinessShortCode' => config('mpesa.shortcode'),
                'Password' => $this->password($timestamp),
                'Timestamp' => $timestamp,
                'CheckoutRequestID' => $donation->checkout_request_id,
            ]);
        } catch (ConnectionException $e) {
            throw new MpesaUnreachable('No answer from M-Pesa.', previous: $e);
        }

        $json = $response->json() ?? [];

        // While the donor is still deciding, Daraja answers with an error that means "not yet".
        if (
            str_contains((string) ($json['errorCode'] ?? ''), '500.001.1001')
            || str_contains(strtolower((string) ($json['errorMessage'] ?? '')), 'being processed')
        ) {
            return ['code' => null, 'desc' => 'The transaction is being processed.', 'processing' => true];
        }

        if (!$response->successful() || !isset($json['ResultCode'])) {
            throw new MpesaRejected((string) ($json['errorMessage'] ?? 'M-Pesa could not report on this payment.'));
        }

        return ['code' => (int) $json['ResultCode'], 'desc' => (string) ($json['ResultDesc'] ?? ''), 'processing' => false];
    }

    public function callbackUrl(Donation $donation): string
    {
        return rtrim((string) config('mpesa.callback_base'), '/')
            . '/mpesa/callback/' . config('mpesa.callback_token') . '/' . $donation->id;
    }

    private function baseUrl(): string
    {
        return rtrim((string) (config('mpesa.base_url')
            ?: (config('mpesa.env') === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke')), '/');
    }

    private function password(string $timestamp): string
    {
        return base64_encode(config('mpesa.shortcode') . config('mpesa.passkey') . $timestamp);
    }

    private function send(string $token, string $path, array $body): Response
    {
        return Http::withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(config('mpesa.timeout'))
            ->post($this->baseUrl() . $path, $body);
    }

    /** A short-lived access token, kept until just before it expires. */
    /** A short-lived access token, kept until just before it expires. */
    private function token(bool $fresh = false): string
    {
        $key = 'mpesa:token:' . config('mpesa.env');

        if ($fresh) {
            Cache::forget($key);
        }

        if ($cached = Cache::get($key)) {
            return $cached;
        }

        $baseUrl = $this->baseUrl();
        $consumerKey = (string) config('mpesa.consumer_key');
        $consumerSecret = (string) config('mpesa.consumer_secret');

        \Log::info('M-Pesa Auth Attempt', [
            'url' => $baseUrl . '/oauth/v1/generate',
            'key_length' => strlen($consumerKey),
            'secret_length' => strlen($consumerSecret),
        ]);

        // Nothing has been sent to the donor yet, so any failure here is a clean "no".
        try {
            $response = Http::withBasicAuth($consumerKey, $consumerSecret)
                ->acceptJson()
                ->timeout(10)
                ->get($baseUrl . '/oauth/v1/generate', ['grant_type' => 'client_credentials']);
        } catch (ConnectionException $e) {
            throw new MpesaRejected('Could not reach M-Pesa to sign in.', previous: $e);
        }

        $token = $response->json('access_token');

        if (!$response->successful() || blank($token)) {
            \Log::error('M-Pesa Auth Failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new MpesaRejected('M-Pesa did not accept our credentials.');
        }

        $seconds = max(30, (int) $response->json('expires_in', 3599) - 60);
        Cache::put($key, $token, $seconds);

        return $token;
    }

    private function ensureConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new MpesaRejected('M-Pesa is not configured.');
        }
    }
}
