<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BlogTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Field notes from Sori',
            'excerpt' => 'A short summary of the post.',
            'body' => "First paragraph.\n\nSecond paragraph.",
            'images' => ['https://images.example.org/a.jpg'],
            'videos' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'publish' => true,
        ], $overrides);
    }

    public function test_new_users_default_to_the_staff_role(): void
    {
        $user = User::factory()->create();

        $this->assertSame(UserRole::Staff, $user->fresh()->role);
    }

    public function test_blogs_page_is_public_and_paginated(): void
    {
        Blog::factory()->count(12)->create();

        $this->get('/blogs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Blogs')
                ->has('posts.data', 9)
                ->where('posts.last_page', 2));

        $this->get('/blogs?page=2')
            ->assertInertia(fn (Assert $page) => $page->has('posts.data', 3));
    }

    public function test_drafts_and_future_posts_stay_hidden(): void
    {
        Blog::factory()->draft()->create();
        Blog::factory()->create(['published_at' => now()->addDay()]);
        Blog::factory()->create();

        $this->get('/blogs')
            ->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));
    }

    public function test_home_shows_only_published_featured_posts_up_to_three(): void
    {
        Blog::factory()->featured()->count(5)->create();
        Blog::factory()->featured()->draft()->create();
        Blog::factory()->create();

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Home')
                ->has('featuredBlogs', Blog::HOME_FEATURED_LIMIT));
    }

    public function test_public_payload_never_includes_author_email(): void
    {
        $author = User::factory()->create();
        Blog::factory()->create(['user_id' => $author->id]);

        $this->get('/blogs')
            ->assertInertia(fn (Assert $page) => $page
                ->where('posts.data.0.author', $author->name)
                ->missing('posts.data.0.email'));
    }

    public function test_guests_are_sent_to_login_for_the_back_office(): void
    {
        $this->get('/admin/blogs')->assertRedirect('/login');
        $this->post('/admin/blogs', $this->payload())->assertRedirect('/login');
    }

    public function test_staff_can_create_a_post_but_cannot_feature_it(): void
    {
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)
            ->post('/admin/blogs', $this->payload(['is_featured' => true]))
            ->assertRedirect('/admin/blogs');

        $blog = Blog::firstOrFail();

        $this->assertFalse($blog->is_featured);
        $this->assertTrue($blog->isPublished());
        $this->assertSame($staff->id, $blog->user_id);
        $this->assertSame('field-notes-from-sori', $blog->slug);
    }

    public function test_admin_can_feature_a_post_on_create(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post('/admin/blogs', $this->payload(['is_featured' => true]));

        $this->assertTrue(Blog::firstOrFail()->is_featured);
    }

    public function test_only_admins_can_toggle_featured_or_delete(): void
    {
        $blog = Blog::factory()->create();
        $staff = User::factory()->staff()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($staff)->patch("/admin/blogs/{$blog->id}/featured")->assertForbidden();
        $this->actingAs($staff)->delete("/admin/blogs/{$blog->id}")->assertForbidden();

        $this->actingAs($admin)->patch("/admin/blogs/{$blog->id}/featured")->assertRedirect();
        $this->assertTrue($blog->fresh()->is_featured);

        $this->actingAs($admin)->delete("/admin/blogs/{$blog->id}")->assertRedirect('/admin/blogs');
        $this->assertModelMissing($blog);
    }

    public function test_staff_update_leaves_featured_alone(): void
    {
        $blog = Blog::factory()->featured()->create();
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)
            ->put("/admin/blogs/{$blog->id}", $this->payload(['title' => 'New title', 'is_featured' => false]))
            ->assertRedirect('/admin/blogs');

        $this->assertTrue($blog->fresh()->is_featured);
        $this->assertSame('New title', $blog->fresh()->title);
    }

    public function test_unpublishing_makes_a_post_a_draft(): void
    {
        $blog = Blog::factory()->create();
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)
            ->put("/admin/blogs/{$blog->id}", $this->payload(['publish' => false]));

        $this->assertNull($blog->fresh()->published_at);
    }

    public function test_only_youtube_or_vimeo_videos_and_https_pictures_are_accepted(): void
    {
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)
            ->post('/admin/blogs', $this->payload([
                'images' => ['http://insecure.example.org/a.jpg'],
                'videos' => ['https://example.com/video.mp4'],
            ]))
            ->assertSessionHasErrors(['images.0', 'videos.0']);

        $this->assertDatabaseCount('blogs', 0);
    }

    public function test_slugs_stay_unique(): void
    {
        $staff = User::factory()->staff()->create();

        $this->actingAs($staff)->post('/admin/blogs', $this->payload());
        $this->actingAs($staff)->post('/admin/blogs', $this->payload());

        $this->assertSame(
            ['field-notes-from-sori', 'field-notes-from-sori-2'],
            Blog::orderBy('id')->pluck('slug')->all(),
        );
    }
}
