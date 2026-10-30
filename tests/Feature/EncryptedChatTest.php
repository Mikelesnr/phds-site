<?php

namespace Tests\Feature;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Models\Blog;
use App\Models\Conversation;
use App\Models\ConversationKey;
use App\Models\Message;
use App\Models\User;
use App\Models\UserKey;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\InteractsWithChat;
use Tests\TestCase;

class EncryptedChatTest extends TestCase
{
    use InteractsWithChat, RefreshDatabase;

    private function identity(User $user): UserKey
    {
        return $user->chatKey()->create([
            'public_key' => 'pub-'.Str::random(20),
            'encrypted_private_key' => '{"locked":"blob"}',
        ]);
    }

    private function group(User $moderator, array $members = [], bool $open = false): Conversation
    {
        $c = new Conversation;
        $c->type = ConversationType::Group;
        $c->visibility = $open ? ConversationVisibility::Open : ConversationVisibility::Private;
        $c->name = 'Group '.Str::random(4);
        $c->created_by = $moderator->id;
        $c->save();

        $c->members()->attach($moderator->id, ['role' => MemberRole::Moderator->value]);
        foreach ($members as $member) {
            $c->members()->attach($member->id, ['role' => MemberRole::Member->value]);
        }

        return $c;
    }

    private function seal(Conversation $c, User $user, int $version = 1): void
    {
        ConversationKey::create([
            'conversation_id' => $c->id, 'user_id' => $user->id, 'key_version' => $version, 'wrapped_key' => 'sealed',
        ]);
    }

    // ------------------------------------------------------------ nothing readable is stored

    public function test_the_server_has_no_plaintext_column_for_messages(): void
    {
        $this->assertFalse(Schema::hasColumn('messages', 'body'));
        $this->assertTrue(Schema::hasColumns('messages', ['ciphertext', 'iv', 'key_version']));
    }

    public function test_what_you_send_is_stored_exactly_as_sent(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);
        $payload = $this->cipher('opaque-bytes');

        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $payload)->assertCreated();

        $row = Message::find($payload['id']);
        $this->assertSame($payload['ciphertext'], $row->ciphertext);
        $this->assertSame($payload['iv'], $row->iv);
    }

    public function test_other_people_never_receive_anyones_private_key(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $this->identity($b);
        $c = $this->dm($a, $b);

        $response = $this->actingAs($a)->get("/team-chat/{$c->id}");
        $this->assertStringNotContainsString('locked', $response->getContent());
        $this->assertStringNotContainsString('encrypted_private_key', $response->getContent());
    }

    // ------------------------------------------------------------ identity

    public function test_a_person_stores_a_public_key_and_a_locked_private_key(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/chat-keys/me')->assertOk()->assertJson(['exists' => false]);

        $this->actingAs($user)->postJson('/chat-keys', [
            'public_key' => 'BAUp+abc/def=', 'encrypted_private_key' => '{"v":1,"ct":"xyz"}',
        ])->assertCreated();

        $this->actingAs($user)->getJson('/chat-keys/me')
            ->assertOk()
            ->assertJson(['exists' => true, 'public_key' => 'BAUp+abc/def=', 'encrypted_private_key' => '{"v":1,"ct":"xyz"}']);
    }

    public function test_an_identity_cannot_be_silently_overwritten(): void
    {
        $user = User::factory()->create();
        $original = $this->identity($user);

        $this->actingAs($user)->postJson('/chat-keys', [
            'public_key' => 'newkey', 'encrypted_private_key' => '{}',
        ])->assertStatus(409);

        $this->assertSame($original->public_key, $user->fresh()->chatKey->public_key);
    }

    public function test_identity_input_is_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/chat-keys', ['public_key' => 'has spaces and <tags>', 'encrypted_private_key' => '{}'])->assertStatus(422);
        $this->actingAs($user)->postJson('/chat-keys', ['public_key' => str_repeat('a', 513), 'encrypted_private_key' => '{}'])->assertStatus(422);
        $this->actingAs($user)->postJson('/chat-keys', ['public_key' => 'ok'])->assertStatus(422);
    }

    public function test_resetting_replaces_my_identity_and_drops_only_my_conversation_keys(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $this->identity($a);
        $c = $this->dm($a, $b);

        $this->actingAs($a)->postJson('/chat-keys/reset', ['public_key' => 'fresh', 'encrypted_private_key' => '{"new":1}'])->assertOk();

        $this->assertSame('fresh', $a->fresh()->chatKey->public_key);
        $this->assertSame(0, ConversationKey::where('user_id', $a->id)->count());
        $this->assertSame(1, ConversationKey::where('user_id', $b->id)->count(), 'other people keep their keys');
    }

    public function test_guests_cannot_touch_keys(): void
    {
        $this->getJson('/chat-keys/me')->assertUnauthorized();
        $this->postJson('/chat-keys', [])->assertUnauthorized();
    }

    // ------------------------------------------------------------ ids

    public function test_ids_are_uuids_everywhere(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);
        $blog = Blog::factory()->create();
        $payload = $this->cipher();
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $payload)->assertCreated();

        foreach ([$a->id, $c->id, $blog->id, Message::first()->id] as $id) {
            $this->assertTrue(Str::isUuid($id), "{$id} should be a uuid");
        }

        $this->actingAs($a)->get('/team-chat/12345')->assertNotFound();
    }

    public function test_new_ids_sort_in_creation_order(): void
    {
        $ids = collect(range(1, 5))->map(fn () => User::factory()->create()->id);

        $this->assertSame($ids->all(), $ids->sort()->values()->all(), 'uuid v7 ids are time ordered');
    }

    // ------------------------------------------------------------ idempotent sending

    public function test_sending_the_same_message_twice_creates_it_once(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);
        $payload = $this->cipher('retry me');

        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $payload)->assertCreated();
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $payload)
            ->assertOk()
            ->assertJsonPath('message.id', $payload['id']);

        $this->assertSame(1, Message::count());
        $this->assertSame(1, $b->notifications()->count(), 'a retry does not notify again');
    }

    public function test_a_message_id_cannot_be_claimed_by_someone_else_or_somewhere_else(): void
    {
        [$a, $b, $c3] = User::factory()->count(3)->create();
        $one = $this->dm($a, $b);
        $two = $this->dm($a, $c3);
        $payload = $this->cipher();

        $this->actingAs($a)->postJson("/team-chat/{$one->id}/messages", $payload)->assertCreated();

        $this->actingAs($b)->postJson("/team-chat/{$one->id}/messages", $payload)->assertStatus(409);
        $this->actingAs($a)->postJson("/team-chat/{$two->id}/messages", $payload)->assertStatus(409);
        $this->assertSame(1, Message::count());
    }

    public function test_you_cannot_write_with_a_key_you_do_not_hold(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = Conversation::directBetween($a, $b); // nobody has a key yet

        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $this->cipher())->assertStatus(422);

        $this->seal($c, $a);
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $this->cipher())->assertCreated();
        $this->actingAs($b)->postJson("/team-chat/{$c->id}/messages", $this->cipher())->assertStatus(422);
    }

    // ------------------------------------------------------------ sharing keys

    private function grant(User $by, Conversation $c, array $entries)
    {
        return $this->actingAs($by)->postJson("/team-chat/{$c->id}/keys", ['keys' => $entries]);
    }

    private function entry(User $for, int $version = 1, string $sealed = 'sealed-copy'): array
    {
        return ['user_id' => $for->id, 'version' => $version, 'wrapped_key' => $sealed];
    }

    public function test_either_person_in_a_direct_chat_can_start_the_key_and_must_include_their_own_copy(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = Conversation::directBetween($a, $b);

        $this->grant($a, $c, [$this->entry($b)])->assertStatus(422); // no copy for the person starting it
        $this->assertSame(0, ConversationKey::count());

        $this->grant($a, $c, [$this->entry($a), $this->entry($b)])->assertCreated();
        $this->assertSame(2, ConversationKey::count());
    }

    public function test_only_a_groups_moderator_can_start_its_key(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create();
        $g = $this->group($moderator, [$member]);

        $this->grant($member, $g, [$this->entry($member), $this->entry($moderator)])->assertForbidden();
        $this->grant($moderator, $g, [$this->entry($moderator), $this->entry($member)])->assertCreated();
    }

    public function test_a_second_person_cannot_start_the_same_key_or_overwrite_it(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = Conversation::directBetween($a, $b);

        $this->grant($a, $c, [$this->entry($a, sealed: 'first'), $this->entry($b, sealed: 'first-b')])->assertCreated();
        $this->grant($b, $c, [$this->entry($b, sealed: 'attacker'), $this->entry($a, sealed: 'attacker')])->assertStatus(201);

        $this->assertSame('first-b', ConversationKey::where('user_id', $b->id)->value('wrapped_key'), 'an existing copy is never replaced');
        $this->assertSame('first', ConversationKey::where('user_id', $a->id)->value('wrapped_key'));
    }

    public function test_someone_without_the_key_cannot_hand_it_out(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = Conversation::directBetween($a, $b);
        $this->seal($c, $a);

        $this->grant($b, $c, [$this->entry($b), $this->entry($a)])->assertStatus(409);
        $this->assertSame(1, ConversationKey::count());
    }

    public function test_a_holder_can_share_the_key_with_a_member_who_is_missing_it(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = Conversation::directBetween($a, $b);
        $this->seal($c, $a);

        $this->grant($a, $c, [$this->entry($b)])->assertCreated();

        $this->assertTrue(ConversationKey::where(['conversation_id' => $c->id, 'user_id' => $b->id])->exists());
        $this->assertSame($a->id, ConversationKey::where('user_id', $b->id)->value('granted_by'));
    }

    public function test_in_a_private_group_only_the_moderator_shares_keys(): void
    {
        [$moderator, $member, $newcomer] = User::factory()->count(3)->create();
        $g = $this->group($moderator, [$member, $newcomer]);
        $this->seal($g, $moderator);
        $this->seal($g, $member);

        $this->grant($member, $g, [$this->entry($newcomer)])->assertForbidden();
        $this->grant($moderator, $g, [$this->entry($newcomer)])->assertCreated();
    }

    public function test_in_an_open_group_any_holder_can_share_the_key_with_a_new_joiner(): void
    {
        [$moderator, $member, $joiner] = User::factory()->count(3)->create();
        $g = $this->group($moderator, [$member, $joiner], open: true);
        $this->seal($g, $moderator);
        $this->seal($g, $member);

        $this->grant($member, $g, [$this->entry($joiner)])->assertCreated();
    }

    public function test_keys_only_go_to_members_and_only_for_versions_that_exist(): void
    {
        [$a, $b, $outsider] = User::factory()->count(3)->create();
        $c = Conversation::directBetween($a, $b);

        $this->grant($a, $c, [$this->entry($a), $this->entry($outsider)])->assertStatus(422);
        $this->grant($a, $c, [$this->entry($a, version: 2)])->assertStatus(422);
        $this->assertSame(0, ConversationKey::count(), 'a refused request leaves nothing behind');
    }

    public function test_outsiders_cannot_see_or_send_keys_for_a_conversation(): void
    {
        [$a, $b, $outsider] = User::factory()->count(3)->create();
        $c = $this->dm($a, $b);

        $this->actingAs($outsider)->getJson("/team-chat/{$c->id}/keys")->assertNotFound();
        $this->grant($outsider, $c, [$this->entry($outsider)])->assertNotFound();
    }

    public function test_key_sharing_is_validated(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);

        $this->actingAs($a)->postJson("/team-chat/{$c->id}/keys", [])->assertStatus(422);
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/keys", ['keys' => [['user_id' => 'nope', 'version' => 1, 'wrapped_key' => 'x']]])->assertStatus(422);
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/keys", ['keys' => [$this->entry($b, sealed: str_repeat('a', 2049))]])->assertStatus(422);
    }

    // ------------------------------------------------------------ what the browser is given

    public function test_a_conversation_carries_only_my_sealed_keys_and_who_else_has_one(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $keyA = $this->identity($a);
        $this->identity($b);
        $c = Conversation::directBetween($a, $b);
        $this->seal($c, $a);

        $this->actingAs($a)->get("/team-chat/{$c->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('conversation.crypto.key_version', 1)
                ->where('conversation.crypto.provisioned', true)
                ->has('conversation.crypto.my_keys', 1)
                ->where('conversation.crypto.my_keys.0.wrapped_key', 'sealed')
                ->where('conversation.members.0.public_key', fn ($key) => is_string($key))
                ->has('conversation.members', 2)
                ->where('conversation.members', function ($members) use ($a, $b) {
                    $byId = collect($members)->keyBy('id');

                    return $byId[$a->id]['has_key'] === true && $byId[$b->id]['has_key'] === false;
                }));

        $this->actingAs($b)->get("/team-chat/{$c->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('conversation.crypto.provisioned', true)
                ->has('conversation.crypto.my_keys', 0));
    }

    public function test_people_are_listed_with_whether_they_have_set_up_encryption(): void
    {
        [$a, $b, $c] = User::factory()->count(3)->create();
        $this->identity($b);

        $this->actingAs($a)->get('/team-chat')->assertInertia(fn (Assert $page) => $page
            ->where('people', fn ($people) => collect($people)->keyBy('id')[$b->id]['has_keys'] === true
                && collect($people)->keyBy('id')[$c->id]['has_keys'] === false));
    }

    public function test_the_sidebar_shows_no_message_text(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $this->cipher('secret plans'))->assertCreated();

        $response = $this->actingAs($a)->get('/team-chat');
        $response->assertInertia(fn (Assert $page) => $page->where('sidebar.direct.0.preview', 'Encrypted message'));
        $this->assertStringNotContainsString('secret plans', $response->getContent());
    }

    // ------------------------------------------------------------ rotation

    public function test_removing_a_member_starts_a_new_key_version_and_drops_their_keys(): void
    {
        [$moderator, $member, $leaver] = User::factory()->count(3)->create();
        $g = $this->group($moderator, [$member, $leaver]);
        foreach ([$moderator, $member, $leaver] as $u) {
            $this->seal($g, $u);
        }

        $this->actingAs($moderator)->delete("/team-chat/{$g->id}/members/{$leaver->id}")->assertRedirect();

        $this->assertSame(2, $g->fresh()->key_version);
        $this->assertSame(0, ConversationKey::where(['conversation_id' => $g->id, 'user_id' => $leaver->id])->count());
        $this->assertSame(1, ConversationKey::where(['conversation_id' => $g->id, 'user_id' => $member->id])->count(), 'remaining members keep their old key');
        $this->actingAs($leaver)->getJson("/team-chat/{$g->id}/keys")->assertNotFound();
    }

    public function test_leaving_a_group_also_starts_a_new_key_version(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create();
        $g = $this->group($moderator, [$member]);
        $this->seal($g, $moderator);
        $this->seal($g, $member);

        $this->actingAs($member)->post("/team-chat/{$g->id}/leave");

        $this->assertSame(2, $g->fresh()->key_version);
    }

    public function test_the_moderator_can_provide_the_new_version_and_writing_follows_it(): void
    {
        [$moderator, $member, $leaver] = User::factory()->count(3)->create();
        $g = $this->group($moderator, [$member, $leaver]);
        foreach ([$moderator, $member, $leaver] as $u) {
            $this->seal($g, $u);
        }
        $this->actingAs($moderator)->delete("/team-chat/{$g->id}/members/{$leaver->id}");

        // Until the moderator's browser provides version 2, nobody can write with it.
        $this->actingAs($member)->postJson("/team-chat/{$g->id}/messages", $this->cipher('x', version: 2))->assertStatus(422);
        $this->actingAs($member)->postJson("/team-chat/{$g->id}/messages", $this->cipher('x', version: 1))->assertCreated();

        $this->grant($moderator, $g, [$this->entry($moderator, 2), $this->entry($member, 2)])->assertCreated();

        $this->actingAs($member)->postJson("/team-chat/{$g->id}/messages", $this->cipher('x', version: 2))->assertCreated();
        $this->actingAs($member)->get("/team-chat/{$g->id}")->assertInertia(fn (Assert $page) => $page
            ->where('conversation.crypto.key_version', 2)
            ->has('conversation.crypto.my_keys', 2));
    }

    public function test_deleting_a_user_starts_new_keys_in_their_groups(): void
    {
        $admin = User::factory()->admin()->create();
        [$moderator, $gone] = User::factory()->count(2)->create();
        $g = $this->group($moderator, [$gone]);
        $this->seal($g, $moderator);
        $this->seal($g, $gone);

        $this->actingAs($admin)->delete("/admin/users/{$gone->id}")->assertRedirect();

        $this->assertSame(2, $g->fresh()->key_version);
        $this->assertSame(0, ConversationKey::where('user_id', $gone->id)->count());
    }

    public function test_deleting_a_message_wipes_the_ciphertext_not_just_hides_it(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = $this->dm($a, $b);
        $payload = $this->cipher('to be erased');
        $this->actingAs($a)->postJson("/team-chat/{$c->id}/messages", $payload)->assertCreated();

        $this->actingAs($a)->deleteJson('/team-chat/messages/'.$payload['id'])->assertOk();

        $raw = \DB::table('messages')->where('id', $payload['id'])->first();
        $this->assertSame('', $raw->ciphertext);
        $this->assertSame('', $raw->iv);
        $this->assertNotNull($raw->deleted_at);
    }

    public function test_a_deleted_authors_messages_still_name_their_sender_for_decryption(): void
    {
        $admin = User::factory()->admin()->create();
        [$leaver, $stayer] = User::factory()->count(2)->create();
        $c = $this->dm($leaver, $stayer);
        $payload = $this->cipher('still readable');
        $this->actingAs($leaver)->postJson("/team-chat/{$c->id}/messages", $payload)->assertCreated();
        $leaverId = $leaver->id;

        $this->actingAs($admin)->delete("/admin/users/{$leaverId}");

        $this->actingAs($stayer)->get("/team-chat/{$c->id}")->assertInertia(fn (Assert $page) => $page
            ->where('conversation.messages.0.user_id', null)
            ->where('conversation.messages.0.sender_id', $leaverId)
            ->where('conversation.messages.0.author', 'Former member'));
    }
}
