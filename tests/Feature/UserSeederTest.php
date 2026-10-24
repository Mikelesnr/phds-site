<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Blog;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class UserSeederTest extends TestCase
{
    use RefreshDatabase;

    private function configure(): void
    {
        config([
            'phds.seed.admin' => [
                'name' => 'Seed Admin',
                'email' => 'Admin@Example.org',
                'password' => 'admin-secret-1',
            ],
            'phds.seed.staff_password' => 'staff-secret-1',
            'phds.seed.staff' => [
                ['name' => 'Staff One', 'email' => 'one@example.org'],
                ['name' => 'Staff Two', 'email' => 'two@example.org'],
            ],
        ]);
    }

    public function test_it_creates_one_admin_and_two_staff_users(): void
    {
        $this->configure();

        $this->seed(UserSeeder::class);

        $this->assertDatabaseCount('users', 3);
        $this->assertSame(1, User::where('role', UserRole::Admin->value)->count());
        $this->assertSame(2, User::where('role', UserRole::Staff->value)->count());

        $admin = User::where('email', 'admin@example.org')->first();
        $this->assertTrue(Hash::check('admin-secret-1', $admin->password));

        $staff = User::where('email', 'one@example.org')->first();
        $this->assertTrue(Hash::check('staff-secret-1', $staff->password));
    }

    public function test_running_it_twice_does_not_duplicate_and_syncs_passwords_from_env(): void
    {
        $this->configure();
        $this->seed(UserSeeder::class);

        config(['phds.seed.admin.password' => 'rotated-in-env-2']);

        $this->seed(UserSeeder::class);

        $this->assertDatabaseCount('users', 3);
        $this->assertTrue(Hash::check(
            'rotated-in-env-2',
            User::where('email', 'admin@example.org')->first()->password,
        ));
    }

    public function test_seeded_admin_can_log_in_whatever_case_the_email_is_typed_in(): void
    {
        $this->configure();
        $this->seed(UserSeeder::class);

        $this->post('/login', ['email' => 'ADMIN@Example.org', 'password' => 'admin-secret-1'])
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();
    }

    public function test_it_refuses_to_run_without_admin_credentials(): void
    {
        config(['phds.seed.admin' => ['name' => 'X', 'email' => null, 'password' => null]]);

        $this->expectException(RuntimeException::class);

        $this->seed(UserSeeder::class);
    }

    public function test_staff_are_skipped_without_a_staff_password(): void
    {
        $this->configure();
        config(['phds.seed.staff_password' => null]);

        $this->seed(UserSeeder::class);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_database_seeder_creates_users_before_posts_and_attributes_them(): void
    {
        $this->configure();

        $this->seed(DatabaseSeeder::class);

        $admin = User::where('email', 'admin@example.org')->first();

        $this->assertGreaterThan(0, Blog::count());
        $this->assertSame(Blog::count(), Blog::where('user_id', $admin->id)->count());
    }
}
