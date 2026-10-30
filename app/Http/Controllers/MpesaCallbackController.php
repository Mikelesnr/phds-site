<?php

namespace App\Http\Controllers;

use App\Services\Donations\DonationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Where Safaricom reports how a payment went. The address contains a secret token
 * and the donation id, so a stranger cannot guess it, and the donation does not
 * need to be looked up by anything we might not have saved yet.
 */
class MpesaCallbackController extends Controller
{
    public function __invoke(Request $request, string $token, string $donation, DonationService $donations): JsonResponse
    {
        $expected = (string) config('mpesa.callback_token');

        abort_unless($expected !== '' && hash_equals($expected, $token), 404);
        abort_unless(Str::isUuid($donation), 404);

        $allowed = config('mpesa.callback_ips');
        abort_if($allowed !== [] && ! in_array($request->ip(), $allowed, true), 403);

        $payload = $request->json()->all() ?: $request->all();

        $donations->applyCallback($donation, $payload, $request->ip());

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }
}
