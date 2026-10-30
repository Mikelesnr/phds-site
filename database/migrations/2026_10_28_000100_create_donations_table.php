<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            // Chosen by the donor's browser before anything is sent. The same id can be
            // sent any number of times (a retry after a dropped connection) and still
            // means one donation, so it can never be charged twice.
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('amount');
            $table->string('phone', 12);
            $table->string('donor_name', 80)->nullable();
            $table->string('status', 20)->default('pending')->index();
            // Detects the same id being reused for different details.
            $table->string('request_fingerprint', 64);

            $table->string('merchant_request_id')->nullable();
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('mpesa_receipt')->nullable()->unique();
            $table->integer('result_code')->nullable();
            $table->string('result_desc')->nullable();
            $table->unsignedInteger('paid_amount')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamp('initiated_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'status']);
            $table->index(['phone', 'created_at']);
        });

        // Everything Safaricom sends us, kept as received, so money is never a mystery.
        Schema::create('mpesa_callbacks', function (Blueprint $table) {
            $table->id();
            $table->uuid('donation_id')->nullable()->index();
            $table->string('checkout_request_id')->nullable()->index();
            $table->integer('result_code')->nullable();
            $table->string('outcome', 40);
            $table->longText('payload');
            $table->string('ip', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mpesa_callbacks');
        Schema::dropIfExists('donations');
    }
};
