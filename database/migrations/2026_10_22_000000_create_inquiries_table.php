<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->index();
            $table->string('name');
            $table->string('email');
            $table->string('organisation')->nullable();
            $table->string('interest')->nullable();
            $table->text('message')->nullable();
            $table->timestamps();

            $table->index(['type', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
