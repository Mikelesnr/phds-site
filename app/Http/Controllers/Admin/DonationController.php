<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DonationStatus;
use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Donation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DonationController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Donation::class);

        $donations = $this->filtered($request)->with('campaign:id,title')->latest()->paginate(25)->withQueryString();

        $succeeded = Donation::query()->where('status', DonationStatus::Succeeded->value);

        return Inertia::render('Admin/Donations/Index', [
            'donations' => $donations->through(fn (Donation $d) => [
                'id' => $d->id,
                'when' => $d->created_at->format('j M Y, H:i'),
                'campaign' => $d->campaign?->title,
                'name' => $d->donor_name,
                'phone' => $d->phone,
                'amount' => $d->amount,
                'paid_amount' => $d->paid_amount,
                'status' => $d->status->value,
                'receipt' => $d->mpesa_receipt,
                'note' => $d->result_desc,
            ]),
            'totals' => [
                'raised' => (int) (clone $succeeded)->sum(\DB::raw('coalesce(paid_amount, amount)')),
                'count' => (clone $succeeded)->count(),
                'waiting' => Donation::query()->where('status', DonationStatus::AwaitingPayment->value)->count(),
            ],
            'filters' => $request->only(['status', 'campaign', 'q']),
            'campaigns' => Campaign::query()->orderBy('title')->get(['id', 'title']),
            'statuses' => array_map(fn (DonationStatus $s) => $s->value, DonationStatus::cases()),
        ]);
    }

    /** All matching donations as a spreadsheet, for the books. */
    public function export(Request $request): StreamedResponse
    {
        Gate::authorize('viewAny', Donation::class);

        $query = $this->filtered($request)->with('campaign:id,title')->latest();

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Donation id', 'Campaign', 'Name', 'Phone', 'Amount asked', 'Amount paid', 'Status', 'M-Pesa receipt']);

            $query->lazy(500)->each(fn (Donation $d) => fputcsv($out, [
                $d->created_at->format('Y-m-d H:i:s'),
                $d->id,
                $d->campaign?->title ?? 'General',
                $d->donor_name,
                $d->phone,
                $d->amount,
                $d->paid_amount,
                $d->status->value,
                $d->mpesa_receipt,
            ]));

            fclose($out);
        }, 'donations-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    private function filtered(Request $request): Builder
    {
        return Donation::query()
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->input('campaign') === 'general', fn ($q) => $q->whereNull('campaign_id'))
            ->when(
                $request->filled('campaign') && $request->input('campaign') !== 'general',
                fn ($q) => $q->where('campaign_id', $request->input('campaign')),
            )
            ->when($request->input('q'), function ($q, $term) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';
                $q->where(fn ($w) => $w->where('phone', 'like', $like)->orWhere('mpesa_receipt', 'like', $like)->orWhere('donor_name', 'like', $like));
            });
    }
}
