<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered_before_any_user_exists(): void
    {
        $this->get('/register')->assertStatus(200);
    }

    public function test_first_registration_creates_an_admin(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertSame(UserRole::Admin, User::first()->role);
    }

    public function test_registration_is_closed_once_a_user_exists(): void
    {
        User::factory()->create();

        $this->get('/register')->assertNotFound();

        $this->post('/register', [
            'name' => 'Another',
            'email' => 'another@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertNotFound();

        $this->assertDatabaseCount('users', 1);
    }
}
