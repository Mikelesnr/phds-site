<?php

namespace App\Http\Controllers;

use App\Http\Requests\DonationRequest;
use App\Models\Campaign;
use App\Models\Donation;
use App\Services\Donations\DonationException;
use App\Services\Donations\DonationService;
use App\Services\Mpesa\MpesaClient;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class DonateController extends Controller
{
    public function __construct(
        private readonly DonationService $donations,
        private readonly MpesaClient $mpesa,
    ) {}

    /** The general donation, always available, and the open campaigns. */
    public function index(): Response
    {
        return Inertia::render('Donate/Index', [
            'campaigns' => Campaign::query()->open()->with('blog')->latest()->limit(12)->get()
                ->map(fn (Campaign $c) => $c->toPublicArray())->all(),
            'form' => $this->formConfig(),
        ]);
    }

    public function campaign(Campaign $campaign): Response
    {
        // Switched-off campaigns are drafts: they do not exist for the public.
        abort_unless($campaign->is_active, 404);

        return Inertia::render('Donate/Campaign', [
            'campaign' => $campaign->load('blog')->toPublicArray(withStory: true),
            'open' => $campaign->isOpen(),
            'form' => $this->formConfig(),
        ]);
    }

    /**
     * Start a donation. Safe to repeat: the same id always returns the same donation,
     * so a retry after a dropped connection can never charge anyone twice.
     */
    public function start(DonationRequest $request): JsonResponse
    {
        $data = $request->validated();
        $campaign = filled($data['campaign_id'] ?? null) ? Campaign::query()->findOrFail($data['campaign_id']) : null;

        $known = Donation::query()->whereKey($data['id'])->exists();

        if (! $known) {
            if (! $this->mpesa->isConfigured()) {
                return response()->json(['message' => 'M-Pesa donations are not available right now. Please try again later.'], 503);
            }

            if ($campaign && ! $campaign->isOpen()) {
                return response()->json(['message' => 'This campaign is not accepting donations.'], 422);
            }
        }

        try {
            [$donation, $created] = $this->donations->start(
                $data['id'],
                (int) $data['amount'],
                $data['phone'],
                $campaign,
                filled($data['donor_name'] ?? null) ? trim($data['donor_name']) : null,
                $request->ip(),
            );
        } catch (DonationException $e) {
            return response()->json(['message' => $e->getMessage(), ...$e->context], $e->status);
        }

        return response()->json($donation->load('campaign')->toStatusArray(), $created ? 201 : 200);
    }

    /** Polled by the donor's browser while they enter their PIN. */
    public function status(Donation $donation): JsonResponse
    {
        // If the callback is slow, ask M-Pesa ourselves, but not more than every 20 seconds.
        if ($donation->status->isOpen()
            && $donation->created_at->lt(now()->subSeconds(40))
            && ($donation->last_checked_at === null || $donation->last_checked_at->lt(now()->subSeconds(20)))) {
            $donation = $this->donations->reconcile($donation);
        }

        return response()->json($donation->load('campaign')->toStatusArray());
    }

    /** @return array<string, mixed> */
    private function formConfig(): array
    {
        return [
            'ready' => $this->mpesa->isConfigured(),
            'min' => config('mpesa.min_amount'),
            'max' => config('mpesa.max_amount'),
            'quick' => config('mpesa.quick_amounts'),
        ];
    }
}
