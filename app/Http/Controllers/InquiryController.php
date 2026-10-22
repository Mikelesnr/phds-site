<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InquiryController extends Controller
{
    public function contact(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'organisation' => ['nullable', 'string', 'max:160'],
            'interest' => ['nullable', 'string', Rule::in(config('phds.interests'))],
            'message' => ['required', 'string', 'min:10', 'max:4000'],
            'website' => ['nullable', 'string'], // honeypot, real visitors leave it empty
        ]);

        if (filled($data['website'] ?? null)) {
            return back()->with('success', 'Thank you. Your message has been received.');
        }

        Inquiry::create([
            'type' => Inquiry::TYPE_CONTACT,
            'name' => $data['name'],
            'email' => $data['email'],
            'organisation' => $data['organisation'] ?? null,
            'interest' => $data['interest'] ?? null,
            'message' => $data['message'],
        ]);

        return back()->with('success', 'Thank you. Your message has been received and we will be in touch.');
    }

    public function subscribe(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'website' => ['nullable', 'string'],
        ]);

        if (filled($data['website'] ?? null)) {
            return back()->with('success', 'Thank you for subscribing.');
        }

        Inquiry::updateOrCreate(
            ['type' => Inquiry::TYPE_NEWSLETTER, 'email' => $data['email']],
            ['name' => $data['name']],
        );

        return back()->with('success', 'Thank you for subscribing. We will share updates as the work grows.');
    }
}
