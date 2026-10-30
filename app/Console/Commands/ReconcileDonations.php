<?php

namespace App\Console\Commands;

use App\Enums\DonationStatus;
use App\Models\Donation;
use App\Services\Donations\DonationService;
use Illuminate\Console\Command;

class ReconcileDonations extends Command
{
    protected $signature = 'donations:reconcile';

    protected $description = 'Settle donations still waiting for M-Pesa: ask Safaricom what happened, or expire them.';

    public function handle(DonationService $donations): int
    {
        $waiting = Donation::query()
            ->whereIn('status', [DonationStatus::Pending->value, DonationStatus::AwaitingPayment->value])
            ->where('created_at', '<', now()->subSeconds(40))
            ->where(fn ($q) => $q->whereNull('last_checked_at')->orWhere('last_checked_at', '<', now()->subSeconds(20)))
            ->limit(50)
            ->get();

        foreach ($waiting as $donation) {
            $donations->reconcile($donation);
        }

        $this->info("Checked {$waiting->count()} waiting donation(s).");

        return self::SUCCESS;
    }
}
