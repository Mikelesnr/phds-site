<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_pages_render(): void
    {
        $pages = [
            '/' => 'Home',
            '/about' => 'About',
            '/about/board' => 'Board',
            '/what-we-do' => 'WhatWeDo',
            '/where-we-work' => 'WhereWeWork',
            '/get-involved' => 'GetInvolved',
            '/contact' => 'Contact',
        ];

        foreach ($pages as $url => $component) {
            $this->get($url)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component($component));
        }
    }

    public function test_every_focus_area_has_a_page(): void
    {
        foreach (array_keys(config('phds.focus_areas')) as $slug) {
            $this->get("/focus-areas/{$slug}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('FocusAreaShow')
                    ->where('area.slug', $slug));
        }
    }

    public function test_unknown_focus_area_is_a_404(): void
    {
        $this->get('/focus-areas/not-a-real-area')->assertNotFound();
    }

    public function test_contact_form_stores_an_inquiry(): void
    {
        $this->post('/contact', [
            'name' => 'Amina Otieno',
            'email' => 'amina@example.org',
            'interest' => 'Research collaboration',
            'message' => 'We would like to explore a joint study on land use.',
        ])->assertRedirect();

        $this->assertDatabaseHas('inquiries', [
            'type' => Inquiry::TYPE_CONTACT,
            'email' => 'amina@example.org',
        ]);
    }

    public function test_contact_form_validates_input(): void
    {
        $this->post('/contact', ['name' => '', 'email' => 'nope', 'message' => 'short'])
            ->assertSessionHasErrors(['name', 'email', 'message']);
    }

    public function test_honeypot_discards_spam(): void
    {
        $this->post('/contact', [
            'name' => 'Bot',
            'email' => 'bot@example.org',
            'message' => 'Buy cheap things at my website today.',
            'website' => 'https://spam.example',
        ])->assertRedirect();

        $this->assertDatabaseCount('inquiries', 0);
    }

    public function test_newsletter_signup_is_not_duplicated(): void
    {
        $payload = ['name' => 'Joy', 'email' => 'joy@example.org'];

        $this->post('/subscribe', $payload)->assertRedirect();
        $this->post('/subscribe', $payload)->assertRedirect();

        $this->assertDatabaseCount('inquiries', 1);
    }
}
