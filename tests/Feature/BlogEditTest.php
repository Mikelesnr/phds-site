<?php

namespace Tests\Feature;

use App\Models\Blog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogEditTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Edited title',
            'excerpt' => 'Edited summary.',
            'body' => 'Edited body.',
            'images' => ['/images/weighing-catch.jpg'],
            'videos' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            'publish' => true,
        ], $overrides);
    }

    public function test_a_seeded_post_with_site_pictures_can_get_a_video(): void
    {
        $admin = User::factory()->admin()->create();
        $blog = Blog::factory()->create(['images' => ['/images/weighing-catch.jpg'], 'videos' => []]);

        $this->actingAs($admin)
            ->put("/admin/blogs/{$blog->id}", $this->payload())
            ->assertRedirect('/admin/blogs');

        $this->assertSame(
            ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
            $blog->fresh()->videos,
        );
    }

    public function test_staff_can_save_a_vimeo_video(): void
    {
        $staff = User::factory()->staff()->create();
        $blog = Blog::factory()->create();

        $this->actingAs($staff)
            ->put("/admin/blogs/{$blog->id}", $this->payload([
                'images' => ['https://images.example.org/a.jpg'],
                'videos' => ['https://vimeo.com/76979871'],
            ]))
            ->assertSessionHasNoErrors();

        $this->assertSame(['https://vimeo.com/76979871'], $blog->fresh()->videos);
    }

    public function test_unsafe_picture_links_are_still_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        $blog = Blog::factory()->create();

        foreach (['http://insecure.example.org/a.jpg', '//evil.example.org/a.jpg', 'javascript:alert(1)', '/images/../secret.jpg'] as $bad) {
            $this->actingAs($admin)
                ->put("/admin/blogs/{$blog->id}", $this->payload(['images' => [$bad]]))
                ->assertSessionHasErrors('images.0');
        }
    }

    public function test_other_video_hosts_are_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        $blog = Blog::factory()->create();

        $this->actingAs($admin)
            ->put("/admin/blogs/{$blog->id}", $this->payload(['videos' => ['https://example.org/video.mp4']]))
            ->assertSessionHasErrors('videos.0');
    }
}
