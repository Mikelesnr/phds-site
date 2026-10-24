<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Creates one administrator and two staff users.
 *
 * Names, emails and passwords come from config/phds.php, which reads them from
 * .env. The .env file is the source of truth for these accounts: running the
 * seeder again creates missing users and resets name, role and password to
 * match .env. Nobody is duplicated, users are matched by email.
 *
 * If .env was edited and nothing changes, run `php artisan config:clear`
 * first, a cached config keeps the old values.
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
        $email = strtolower(trim($email));
        $password = trim($password);

        $user = User::firstOrNew(['email' => $email]);
        $created = ! $user->exists;

        // The model casts the password to a hash, so the plain value is passed.
        $user->password = $password;
        $user->email_verified_at ??= now();

        // Role is not mass assignable, the enum guards it.
        $user->forceFill(['name' => trim($name), 'role' => $role])->save();

        // Prove the stored hash really matches the .env password.
        if (! Hash::check($password, $user->fresh()->password)) {
            throw new RuntimeException("The saved password for {$email} does not match .env.");
        }

        $this->command?->info(($created ? 'Created ' : 'Updated ').$role->value." {$email}");
    }
}
