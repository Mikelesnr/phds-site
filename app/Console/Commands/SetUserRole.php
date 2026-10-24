<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;

class SetUserRole extends Command
{
    protected $signature = 'user:role {email : Email of an existing user} {role : One of the UserRole values}';

    protected $description = 'Give an existing user a role (for example the first admin)';

    public function handle(): int
    {
        $role = UserRole::tryFrom((string) $this->argument('role'));

        if ($role === null) {
            $this->error('Unknown role. Use one of: '.implode(', ', UserRole::values()));

            return self::FAILURE;
        }

        $user = User::where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('No user with that email.');

            return self::FAILURE;
        }

        $user->role = $role;
        $user->save();

        $this->info("{$user->email} is now {$role->label()}.");

        return self::SUCCESS;
    }
}
