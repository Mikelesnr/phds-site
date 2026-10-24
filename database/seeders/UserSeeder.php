<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Creates one administrator and two staff users.
 *
 * Names, emails and passwords come from config/phds.php, which reads them from
 * .env. Safe to run more than once: users are matched by email, and the
 * password of an existing user is never overwritten.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = config('phds.seed.admin');

        if (blank($admin['email']) || blank($admin['password'])) {
            throw new RuntimeException(
                'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding users.'
            );
        }

        $this->seedUser($admin['name'], $admin['email'], $admin['password'], UserRole::Admin);

        $staffPassword = config('phds.seed.staff_password');

        if (blank($staffPassword)) {
            $this->command?->warn('SEED_STAFF_PASSWORD is not set, so the staff users were skipped.');

            return;
        }

        foreach (config('phds.seed.staff') as $staff) {
            if (blank($staff['email'])) {
                continue;
            }

            $this->seedUser($staff['name'], $staff['email'], $staffPassword, UserRole::Staff);
        }
    }

    private function seedUser(string $name, string $email, string $password, UserRole $role): void
    {
        $user = User::firstOrNew(['email' => strtolower($email)]);

        if (! $user->exists) {
            // The model casts the password to a hash, so the plain value is passed.
            $user->password = $password;
            $user->email_verified_at = now();
        }

        // Role is not mass assignable, the enum guards it.
        $user->forceFill(['name' => $name, 'role' => $role])->save();
    }
}
