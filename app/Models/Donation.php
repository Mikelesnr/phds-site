<?php

namespace App\Models;

use App\Enums\DonationStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donation extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => DonationStatus::class,
            'amount' => 'integer',
            'paid_amount' => 'integer',
            'result_code' => 'integer',
            'paid_at' => 'datetime',
            'initiated_at' => 'datetime',
            'expires_at' => 'datetime',
            'last_checked_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * Turn what people type (0712 345 678, +254 712 345 678, 712345678) into the
     * 2547XXXXXXXX form M-Pesa wants. Returns null when it is not a Kenyan mobile number.
     */
    public static function normalizePhone(string $raw): ?string
    {
        $digits = preg_replace('/[\s\-().]/', '', $raw) ?? '';
        $digits = ltrim($digits, '+');

        if (preg_match('/^0([17]\d{8})$/', $digits, $m) || preg_match('/^254([17]\d{8})$/', $digits, $m) || preg_match('/^([17]\d{8})$/', $digits, $m)) {
            return '254'.$m[1];
        }

        return null;
    }

    /** What makes two requests "the same donation". */
    public static function fingerprint(int $amount, string $phone, ?string $campaignId): string
    {
        return hash('sha256', implode('|', [$amount, $phone, $campaignId ?? 'general']));
    }

    /** 2547•• ••• 149, enough for a donor to recognise their number, not enough to leak it. */
    public function maskedPhone(): string
    {
        return substr($this->phone, 0, 4).'•• ••• '.substr($this->phone, -3);
    }

    /** @return array<string, mixed> */
    public function toStatusArray(): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'terminal' => $this->status->isTerminal(),
            'message' => $this->friendlyMessage(),
            'amount' => $this->amount,
            'campaign' => $this->campaign?->title,
            'receipt' => $this->mpesa_receipt,
            'phone' => $this->maskedPhone(),
        ];
    }

    public function friendlyMessage(): string
    {
        $amount = number_format($this->paid_amount ?? $this->amount);

        return match ($this->status) {
            DonationStatus::Pending => 'Starting your payment...',
            DonationStatus::AwaitingPayment => 'Check your phone and enter your M-Pesa PIN to complete the donation.',
            DonationStatus::Succeeded => "Thank you! Your donation of KES {$amount} was received.",
            DonationStatus::Cancelled => 'You cancelled the payment on your phone. You have not been charged.',
            DonationStatus::Expired => 'The payment request timed out before it was approved. You have not been charged.',
            // Safaricom's own wording is technical, so donors see ours. Admins can read the original.
            DonationStatus::Failed => match ($this->result_code) {
                1 => 'Your M-Pesa balance is too low for this amount. You have not been charged.',
                2001 => 'The M-Pesa PIN was not right. You have not been charged.',
                null => 'We could not start the M-Pesa payment. You have not been charged. Please try again in a moment.',
                default => 'The payment could not be completed. You have not been charged.',
            },
        };
    }
}
