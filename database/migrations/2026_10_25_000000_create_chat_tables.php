<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 20);
            $table->string('visibility', 20)->default('private');
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Which encryption key is current. It goes up whenever someone leaves or is removed.
            $table->unsignedInteger('key_version')->default(1);
            // "smallerId:largerId" so a pair of people share exactly one direct chat.
            $table->string('direct_key')->nullable()->unique();
            $table->timestamps();

            $table->index(['type', 'visibility']);
        });

        Schema::create('conversation_user', function (Blueprint $table) {
            $table->id(); // join order, used to pick the longest-standing member
            $table->foreignUuid('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained()->cascadeOnDelete();
            // Kept when the author is removed, shown as a former member.
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            // A permanent copy of who wrote it. The encryption is bound to this, so removing
            // a user later can never make their old messages unreadable.
            $table->uuid('sender_id')->index();
            // Order inside a conversation. Ids are random uuids, so they cannot say who came first.
            $table->unsignedBigInteger('seq');
            // End-to-end encrypted. The server stores only ciphertext and never holds a key.
            $table->text('ciphertext');
            $table->string('iv', 64);
            $table->unsignedInteger('key_version')->default(1);
            $table->timestamp('edited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['conversation_id', 'seq']);
        });

        // Each person's public key, and their private key locked with their own chat
        // passphrase. The server cannot unlock it.
        Schema::create('user_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('public_key');
            $table->text('encrypted_private_key');
            $table->timestamps();
        });

        // A conversation's key, sealed separately for each member with their public key.
        Schema::create('conversation_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('key_version');
            $table->text('wrapped_key');
            $table->foreignUuid('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id', 'key_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_keys');
        Schema::dropIfExists('user_keys');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_user');
        Schema::dropIfExists('conversations');
    }
};
