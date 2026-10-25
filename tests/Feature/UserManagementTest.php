<?php

namespace Tests\Feature;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Enums\UserRole;
use App\Models\Blog;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function valid(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Faith Wanjiku',
            'email' => 'Faith@Example.org',
            'role' => 'staff',
            'password' => 'a-long-password-1',
            'password_confirmation' => 'a-long-password-1',
        ], $overrides);
    }

    public function test_staff_and_guests_are_kept_out(): void
    {
        $staff = User::factory()->staff()->create();
        $target = User::factory()->create();

        $this->get('/admin/users')->assertRedirect('/login');

        $this->actingAs($staff)->get('/admin/users')->assertForbidden();
        $this->actingAs($staff)->get('/admin/users/create')->assertForbidden();
        $this->actingAs($staff)->post('/admin/users', $this->valid())->assertForbidden();
        $this->actingAs($staff)->get("/admin/users/{$target->id}/edit")->assertForbidden();
        $this->actingAs($staff)->put("/admin/users/{$target->id}", $this->valid())->assertForbidden();
        $this->actingAs($staff)->delete("/admin/users/{$target->id}")->assertForbidden();

        $this->assertModelExists($target);
    }

    public function test_an_admin_sees_everyone(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->staff()->count(2)->create();

        $this->actingAs($admin)->get('/admin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users/Index')
                ->has('users', 3)
                ->has('users.0', fn (Assert $u) => $u->hasAll(['id', 'name', 'email', 'role', 'blogs_count', 'created_at', 'is_me'])));
    }

    public function test_an_admin_can_create_a_user_who_can_then_log_in(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->post('/admin/users', $this->valid(['role' => 'admin']))
            ->assertRedirect('/admin/users');

        $user = User::where('email', 'faith@example.org')->firstOrFail();

        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue(Hash::check('a-long-password-1', $user->password));
        $this->assertNotNull($user->email_verified_at);

        auth()->logout();
        $this->post('/login', ['email' => 'FAITH@example.org', 'password' => 'a-long-password-1'])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_creating_a_user_is_validated(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['email' => 'taken@example.org']);

        $this->actingAs($admin)->post('/admin/users', $this->valid(['email' => 'taken@example.org']))->assertSessionHasErrors('email');
        $this->actingAs($admin)->post('/admin/users', $this->valid(['role' => 'owner']))->assertSessionHasErrors('role');
        $this->actingAs($admin)->post('/admin/users', $this->valid(['password' => 'short', 'password_confirmation' => 'short']))->assertSessionHasErrors('password');
        $this->actingAs($admin)->post('/admin/users', $this->valid(['password_confirmation' => 'different-one-1']))->assertSessionHasErrors('password');
        $this->actingAs($admin)->post('/admin/users', $this->valid(['password' => null, 'password_confirmation' => null]))->assertSessionHasErrors('password');

        $this->assertSame(2, User::count());
    }

    public function test_updating_keeps_the_password_unless_a_new_one_is_given(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->staff()->create(['name' => 'Old Name', 'password' => 'original-password-1']);

        $this->actingAs($admin)->put("/admin/users/{$user->id}", [
            'name' => 'New Name', 'email' => 'renamed@example.org', 'role' => 'admin',
            'password' => '', 'password_confirmation' => '',
        ])->assertRedirect('/admin/users');

        $user->refresh();
        $this->assertSame('New Name', $user->name);
        $this->assertSame('renamed@example.org', $user->email);
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue(Hash::check('original-password-1', $user->password));

        $this->actingAs($admin)->put("/admin/users/{$user->id}", [
            'name' => 'New Name', 'email' => 'renamed@example.org', 'role' => 'admin',
            'password' => 'brand-new-password-2', 'password_confirmation' => 'brand-new-password-2',
        ]);

        $this->assertTrue(Hash::check('brand-new-password-2', $user->fresh()->password));
    }

    public function test_the_email_check_ignores_the_person_being_edited(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->staff()->create(['email' => 'same@example.org']);

        $this->actingAs($admin)->put("/admin/users/{$user->id}", [
            'name' => 'Same Person', 'email' => 'same@example.org', 'role' => 'staff',
        ])->assertSessionHasNoErrors();
    }

    public function test_an_admin_cannot_change_their_own_role_but_can_change_other_things(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Boss']);

        $this->actingAs($admin)->put("/admin/users/{$admin->id}", [
            'name' => 'Boss', 'email' => $admin->email, 'role' => 'staff',
        ])->assertSessionHasErrors('role');
        $this->assertSame(UserRole::Admin, $admin->fresh()->role);

        $this->actingAs($admin)->put("/admin/users/{$admin->id}", [
            'name' => 'Big Boss', 'email' => $admin->email, 'role' => 'admin',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Big Boss', $admin->fresh()->name);
    }

    public function test_an_admin_can_promote_and_demote_other_people(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->admin()->create();

        $this->actingAs($admin)->put("/admin/users/{$other->id}", [
            'name' => $other->name, 'email' => $other->email, 'role' => 'staff',
        ])->assertSessionHasNoErrors();

        $this->assertSame(UserRole::Staff, $other->fresh()->role);
        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_an_admin_cannot_delete_themselves_but_can_delete_others(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->staff()->create();

        $this->actingAs($admin)->delete("/admin/users/{$admin->id}")->assertForbidden();
        $this->assertModelExists($admin);

        $this->actingAs($admin)->delete("/admin/users/{$other->id}")->assertRedirect('/admin/users');
        $this->assertModelMissing($other);
    }

    public function test_deleting_a_user_keeps_their_posts_and_messages(): void
    {
        $admin = User::factory()->admin()->create();
        $leaver = User::factory()->staff()->create(['name' => 'Leaver']);
        $stayer = User::factory()->staff()->create();

        $blog = Blog::factory()->create(['user_id' => $leaver->id]);
        $direct = Conversation::directBetween($leaver, $stayer);
        $message = new Message(['body' => 'goodbye']);
        $message->conversation_id = $direct->id;
        $message->user_id = $leaver->id;
        $message->save();

        $this->actingAs($admin)->delete("/admin/users/{$leaver->id}")->assertRedirect();

        $this->assertNull($blog->fresh()->user_id);
        $this->assertNull($message->fresh()->user_id);
        $this->assertSame('Former member', $message->fresh()->load('author')->toChatArray()['author']);
    }

    public function test_deleting_a_moderator_hands_the_group_to_the_longest_standing_member(): void
    {
        $admin = User::factory()->admin()->create();
        [$moderator, $first, $second] = User::factory()->count(3)->create();

        $group = new Conversation;
        $group->type = ConversationType::Group;
        $group->visibility = ConversationVisibility::Open;
        $group->name = 'Handover';
        $group->created_by = $moderator->id;
        $group->save();
        $group->members()->attach($moderator->id, ['role' => MemberRole::Moderator->value]);
        $group->members()->attach($first->id, ['role' => MemberRole::Member->value]);
        $group->members()->attach($second->id, ['role' => MemberRole::Member->value]);

        $this->actingAs($admin)->delete("/admin/users/{$moderator->id}");

        $this->assertTrue($group->fresh()->isModeratedBy($first));
        $this->assertFalse($group->fresh()->isModeratedBy($second));
        $this->assertSame($first->id, $group->fresh()->created_by);
    }

    public function test_a_group_with_nobody_left_is_deleted_with_its_last_moderator(): void
    {
        $admin = User::factory()->admin()->create();
        $loner = User::factory()->create();

        $group = new Conversation;
        $group->type = ConversationType::Group;
        $group->visibility = ConversationVisibility::Private;
        $group->name = 'Just me';
        $group->created_by = $loner->id;
        $group->save();
        $group->members()->attach($loner->id, ['role' => MemberRole::Moderator->value]);

        $this->actingAs($admin)->delete("/admin/users/{$loner->id}");

        $this->assertModelMissing($group);
    }
}
