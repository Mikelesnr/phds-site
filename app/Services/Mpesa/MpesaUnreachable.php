<?php

namespace App\Services\Mpesa;

/**
 * We sent the request but never heard back (timeout, dropped connection). The
 * prompt may or may not have reached the phone, so the donation must not be retried
 * blindly: the callback or a status query will settle it.
 */
class MpesaUnreachable extends MpesaException {}
