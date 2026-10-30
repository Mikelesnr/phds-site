<?php

namespace App\Enums;

/** Stored as a plain string, the enum is the guard. */
enum DonationStatus: string
{
    /** Saved, the M-Pesa prompt has not been requested yet. */
    case Pending = 'pending';

    /** The prompt was requested. Waiting for the donor to enter their PIN. */
    case AwaitingPayment = 'awaiting_payment';

    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Expired = 'expired';

    public function isTerminal(): bool
    {
        return ! in_array($this, [self::Pending, self::AwaitingPayment], true);
    }

    public function isOpen(): bool
    {
        return ! $this->isTerminal();
    }
}
