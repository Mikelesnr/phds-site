<?php

namespace App\Policies;

use App\Models\User;

class DonationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }
}
