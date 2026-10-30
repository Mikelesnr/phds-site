<?php

namespace App\Services\Mpesa;

use RuntimeException;

/** Base for everything that can go wrong talking to M-Pesa. */
class MpesaException extends RuntimeException {}
