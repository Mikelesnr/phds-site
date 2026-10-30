<?php

namespace App\Services\Mpesa;

/** M-Pesa answered and said no. We know for certain that no prompt was sent. */
class MpesaRejected extends MpesaException {}
