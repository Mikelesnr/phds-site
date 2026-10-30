<?php

namespace App\Services\Donations;

use App\Enums\DonationStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\MpesaCallback;
use App\Services\Mpesa\MpesaClient;
use App\Services\Mpesa\MpesaException;
use App\Services\Mpesa\MpesaRejected;
use App\Services\Mpesa\MpesaUnreachable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Takes a donation from "the donor pressed Donate" to "the money arrived".
 *
 * The one rule everything here protects: a donation id is charged at most once.
 *  - The id comes from the donor's browser, so retrying after a dropped connection
 *    sends the same id and gets the same donation back.
 *  - The M-Pesa prompt is requested by exactly one request, claimed with an atomic update.
 *  - A callback can arrive twice, or late, and still counts exactly once.
 */
class DonationService
{
    public function __construct(private readonly MpesaClient $mpesa) {}

    /**
     * @return array{0: Donation, 1: bool} the donation, and whether this call created it
     *
     * @throws DonationException
     */
    public function start(string $id, int $amount, string $phone, ?Campaign $campaign, ?string $name, ?string $ip): array
    {
        $fingerprint = Donation::fingerprint($amount, $phone, $campaign?->id);

        $existing = Donation::query()->find($id);

        if ($existing) {
            return [$this->resume($existing, $fingerprint), false];
        }

        $this->guardAgainstAbuse($phone);

        $donation = new Donation;
        $donation->forceFill([
            'id' => $id,
            'campaign_id' => $campaign?->id,
            'amount' => $amount,
            'phone' => $phone,
            'donor_name' => $name,
            'status' => DonationStatus::Pending,
            'request_fingerprint' => $fingerprint,
            'expires_at' => now()->addMinutes(config('mpesa.expiry_minutes')),
            'ip' => $ip,
        ]);

        try {
            $donation->save();
        } catch (UniqueConstraintViolationException) {
            // Two requests with the same id arrived together. The other one won, and it
            // is the one that asks for the payment. This one just reports on it.
            return [$this->resume(Donation::query()->findOrFail($id), $fingerprint), false];
        }

        return [$this->initiate($donation), true];
    }

    /** Called again with an id we already know. Never asks for a second payment. */
    private function resume(Donation $donation, string $fingerprint): Donation
    {
        if (! hash_equals($donation->request_fingerprint, $fingerprint)) {
            throw new DonationException('This payment was already started with different details. Please start a new donation.', 409);
        }

        // A request that crashed after saving but before asking M-Pesa is picked up here.
        if ($donation->status === DonationStatus::Pending
            && $donation->initiated_at === null
            && $donation->created_at->lt(now()->subSeconds(20))) {
            return $this->initiate($donation);
        }

        return $donation->refresh();
    }

    private function guardAgainstAbuse(string $phone): void
    {
        $recent = Donation::query()->where('phone', $phone)->where('created_at', '>=', now()->subHour())->count();

        if ($recent >= config('mpesa.max_per_phone_per_hour')) {
            throw new DonationException('Too many donation attempts from this number. Please try again later.', 429);
        }

        // A second prompt on a phone that has not answered the first would invite a double payment.
        $waiting = Donation::query()
            ->where('phone', $phone)
            ->whereIn('status', [DonationStatus::Pending->value, DonationStatus::AwaitingPayment->value])
            ->where('created_at', '>=', now()->subMinutes(config('mpesa.expiry_minutes')))
            ->first();

        if ($waiting) {
            throw new DonationException(
                'A payment is already waiting for approval on this number. Approve or cancel it on your phone first.',
                409,
                ['existing_id' => $waiting->id],
            );
        }
    }

    /** Ask M-Pesa for payment. Only the request that wins the claim does it. */
    private function initiate(Donation $donation): Donation
    {
        $claimed = Donation::query()
            ->whereKey($donation->id)
            ->whereNull('initiated_at')
            ->update(['initiated_at' => now()]);

        if ($claimed === 0) {
            return $donation->refresh();
        }

        try {
            $reply = $this->mpesa->stkPush($donation);

            $donation->forceFill([
                'status' => DonationStatus::AwaitingPayment,
                'merchant_request_id' => $reply['MerchantRequestID'] ?? null,
                'checkout_request_id' => $reply['CheckoutRequestID'],
            ])->save();
        } catch (MpesaRejected $e) {
            // M-Pesa said no, so nothing was sent and the donor can safely try again.
            Log::warning('M-Pesa refused a donation', ['donation' => $donation->id, 'reason' => $e->getMessage()]);

            $donation->forceFill([
                'status' => DonationStatus::Failed,
                'result_desc' => mb_substr($e->getMessage(), 0, 250),
            ])->save();
        } catch (MpesaUnreachable $e) {
            // We cannot tell whether the prompt went out. Keep waiting: the callback address
            // carries the donation id, so an approval will still be recorded against it.
            Log::warning('M-Pesa did not answer a donation request', ['donation' => $donation->id]);

            $donation->forceFill([
                'status' => DonationStatus::AwaitingPayment,
                'result_desc' => 'No answer from M-Pesa yet, waiting for confirmation.',
            ])->save();
        }

        return $donation->refresh();
    }

    /**
     * Apply what Safaricom told us. Safe to call twice with the same payload.
     *
     * @param  array<string, mixed>  $payload
     */
    public function applyCallback(string $donationId, array $payload, ?string $ip = null): string
    {
        $callback = data_get($payload, 'Body.stkCallback');

        $audit = MpesaCallback::query()->create([
            'donation_id' => $donationId,
            'checkout_request_id' => data_get($callback, 'CheckoutRequestID'),
            'result_code' => data_get($callback, 'ResultCode'),
            'outcome' => 'received',
            'payload' => json_encode($payload),
            'ip' => $ip,
        ]);

        if (! is_array($callback) || ! isset($callback['ResultCode'], $callback['CheckoutRequestID'])) {
            return $this->settle($audit, 'malformed');
        }

        $outcome = DB::transaction(function () use ($donationId, $callback) {
            $donation = Donation::query()->lockForUpdate()->find($donationId);

            if (! $donation) {
                return 'unknown_donation';
            }

            if ($donation->checkout_request_id && $donation->checkout_request_id !== $callback['CheckoutRequestID']) {
                return 'checkout_mismatch';
            }

            $code = (int) $callback['ResultCode'];

            if ($donation->status === DonationStatus::Succeeded) {
                return 'duplicate';
            }

            if ($code === 0) {
                return $this->recordSuccess($donation, $callback);
            }

            // A failure only counts while we are still waiting. It never undoes a payment.
            if ($donation->status->isOpen()) {
                $donation->forceFill([
                    'status' => $this->statusForFailure($code),
                    'result_code' => $code,
                    'result_desc' => mb_substr((string) ($callback['ResultDesc'] ?? ''), 0, 250),
                    'checkout_request_id' => $donation->checkout_request_id ?? $callback['CheckoutRequestID'],
                ])->save();

                return 'failed';
            }

            return 'ignored';
        });

        return $this->settle($audit, $outcome);
    }

    /** @param  array<string, mixed>  $callback */
    private function recordSuccess(Donation $donation, array $callback): string
    {
        $items = collect(data_get($callback, 'CallbackMetadata.Item', []))
            ->mapWithKeys(fn ($item) => [$item['Name'] ?? '' => $item['Value'] ?? null]);

        $receipt = $items->get('MpesaReceiptNumber');

        if ($receipt && Donation::query()->where('mpesa_receipt', $receipt)->whereKeyNot($donation->id)->exists()) {
            Log::critical('M-Pesa receipt already recorded on another donation', ['donation' => $donation->id, 'receipt' => $receipt]);

            return 'duplicate_receipt';
        }

        // Late is fine: if the donor approved after we gave up, the money is real, so it counts.
        $donation->forceFill([
            'status' => DonationStatus::Succeeded,
            'result_code' => 0,
            'result_desc' => mb_substr((string) ($callback['ResultDesc'] ?? ''), 0, 250),
            'checkout_request_id' => $donation->checkout_request_id ?? $callback['CheckoutRequestID'],
            'mpesa_receipt' => $receipt,
            'paid_amount' => (int) round((float) ($items->get('Amount') ?? $donation->amount)),
            'paid_at' => $this->parseTransactionDate($items->get('TransactionDate')),
        ])->save();

        return 'succeeded';
    }

    private function statusForFailure(int $code): DonationStatus
    {
        return match ($code) {
            1032 => DonationStatus::Cancelled,
            1037 => DonationStatus::Expired,
            default => DonationStatus::Failed,
        };
    }

    private function parseTransactionDate(mixed $value): Carbon
    {
        try {
            return Carbon::createFromFormat('YmdHis', (string) $value, 'Africa/Nairobi')->setTimezone(config('app.timezone'));
        } catch (\Throwable) {
            return now();
        }
    }

    private function settle(MpesaCallback $audit, string $outcome): string
    {
        $audit->forceFill(['outcome' => $outcome])->save();

        return $outcome;
    }

    /**
     * For donations still waiting well after they should have been answered:
     * ask M-Pesa what happened, or give up on them.
     */
    public function reconcile(Donation $donation): Donation
    {
        if ($donation->status->isTerminal()) {
            return $donation;
        }

        $donation->forceFill(['last_checked_at' => now()])->save();

        if ($donation->checkout_request_id) {
            try {
                $answer = $this->mpesa->stkQuery($donation);
            } catch (MpesaException) {
                $answer = null;
            }

            if ($answer && ! $answer['processing'] && $answer['code'] !== null) {
                $this->applyQuery($donation->id, $answer);
                $donation->refresh();
            }
        }

        if ($donation->status->isOpen() && $donation->expires_at && now()->gt($donation->expires_at->copy()->addSeconds(60))) {
            DB::transaction(function () use ($donation) {
                $locked = Donation::query()->lockForUpdate()->find($donation->id);

                if ($locked?->status->isOpen()) {
                    $locked->forceFill([
                        'status' => DonationStatus::Expired,
                        'result_desc' => 'No response from M-Pesa in time.',
                    ])->save();
                }
            });
        }

        return $donation->refresh();
    }

    /** @param  array{code: int|null, desc: string, processing: bool}  $answer */
    private function applyQuery(string $donationId, array $answer): void
    {
        DB::transaction(function () use ($donationId, $answer) {
            $donation = Donation::query()->lockForUpdate()->find($donationId);

            if (! $donation || $donation->status->isTerminal()) {
                return;
            }

            $code = (int) $answer['code'];

            $donation->forceFill([
                'status' => $code === 0 ? DonationStatus::Succeeded : $this->statusForFailure($code),
                'result_code' => $code,
                'result_desc' => mb_substr($code === 0 ? 'Confirmed by M-Pesa status query. Receipt not received.' : $answer['desc'], 0, 250),
                'paid_amount' => $code === 0 ? $donation->amount : null,
                'paid_at' => $code === 0 ? now() : null,
            ])->save();
        });
    }
}
