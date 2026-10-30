<?php

namespace App\Http\Requests;

use App\Models\Donation;
use Illuminate\Foundation\Http\FormRequest;

class DonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');

        if (is_string($phone)) {
            // Accept 0712 345 678 or +254712345678. Keep what was typed if it is not a Kenyan number,
            // so the error message is about their input.
            $this->merge(['phone' => Donation::normalizePhone($phone) ?? $phone]);
        }

        if (is_string($this->input('amount')) && ctype_digit($this->input('amount'))) {
            $this->merge(['amount' => (int) $this->input('amount')]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // Chosen by the browser, so a retry is recognised as the same donation.
            'id' => ['required', 'uuid'],
            'amount' => ['required', 'integer', 'min:'.config('mpesa.min_amount'), 'max:'.config('mpesa.max_amount')],
            'phone' => ['required', 'string', 'regex:/^254[17]\d{8}$/'],
            'campaign_id' => ['nullable', 'uuid', 'exists:campaigns,id'],
            'donor_name' => ['nullable', 'string', 'max:80'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a Safaricom number such as 0712 345 678.',
            'amount.min' => 'The smallest donation is KES '.number_format(config('mpesa.min_amount')).'.',
            'amount.max' => 'The largest donation here is KES '.number_format(config('mpesa.max_amount')).'.',
            'amount.integer' => 'Enter a whole number of shillings.',
        ];
    }
}
