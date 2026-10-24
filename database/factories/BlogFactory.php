<?php

namespace Database\Factories;

use App\Models\Blog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Blog>
 */
class BlogFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->sentence(5),
            'excerpt' => fake()->sentence(18),
            'body' => implode("\n\n", fake()->paragraphs(3)),
            'images' => [],
            'videos' => [],
            'is_featured' => false,
            'published_at' => now()->subDay(),
        ];
    }

    public function featured(): static
    {
        return $this->state(['is_featured' => true]);
    }

    public function draft(): static
    {
        return $this->state(['published_at' => null]);
    }
}
