<?php

namespace Tests\Feature;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\InteractsWithChat;
use Tests\TestCase;

class TeamChatTest extends TestCase
{
    use InteractsWithChat, RefreshDatabase;

    private function group(User $moderator, array $members = [], bool $open = false, string $name = 'Lake team'): Conversation
    {
        $conversation = new Conversation;
        $conversation->type = ConversationType::Group;
        $conversation->visibility = $open ? ConversationVisibility::Open : ConversationVisibility::Private;
        $conversation->name = $name;
        $conversation->created_by = $moderator->id;
        $conversation->save();

        $conversation->members()->attach($moderator->id, ['role' => MemberRole::Moderator->value, 'last_read_at' => now()]);

        foreach ($members as $member) {
            $conversation->members()->attach($member->id, ['role' => MemberRole::Member->value, 'last_read_at' => now()]);
        }

        return $this->keyed($conversation);
    }

    private function say(Conversation $conversation, User $author, string $body = 'Hello there'): Message
    {
        $message = new Message;
        $message->conversation_id = $conversation->id;
        $message->user_id = $author->id;
        $message->sender_id = $author->id;
        $message->ciphertext = base64_encode($body);
        $message->iv = base64_encode('0123456789ab');
        $message->key_version = 1;
        $message->save();

        return $message;
    }

    // ---------------------------------------------------------------- direct chats

    public function test_two_people_share_exactly_one_direct_chat(): void
    {
        [$a, $b] = User::factory()->count(2)->create();

        $this->actingAs($a)->post('/team-chat/direct', ['user_id' => $b->id]);
        $this->actingAs($b)->post('/team-chat/direct', ['user_id' => $a->id]);
        $this->actingAs($a)->post('/team-chat/direct', ['user_id' => $b->id]);

        $this->assertSame(1, Conversation::where('type', 'direct')->count());
        $this->assertSame(2, Conversation::first()->members()->count());
    }

    public function test_you_cannot_message_yourself(): void
    {
        $a = User::factory()->create();

        $this->actingAs($a)->post('/team-chat/direct', ['user_id' => $a->id])->assertStatus(422);

        $this->assertSame(0, Conversation::count());
    }

    public function test_a_direct_chat_is_titled_with_the_other_persons_name(): void
    {
        $a = User::factory()->create(['name' => 'Ada Okello']);
        $b = User::factory()->create(['name' => 'Brian Otieno']);
        $conversation = $this->dm($a, $b);

        $this->actingAs($a)->get("/team-chat/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page->where('conversation.title', 'Brian Otieno'));

        $this->actingAs($b)->get("/team-chat/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page->where('conversation.title', 'Ada Okello'));
    }

    public function test_a_third_person_cannot_see_a_direct_chat(): void
    {
        [$a, $b, $c] = User::factory()->count(3)->create();
        $conversation = $this->dm($a, $b);

        $this->actingAs($c)->get("/team-chat/{$conversation->id}")->assertNotFound();
        $this->actingAs($c)->postJson("/team-chat/{$conversation->id}/messages", $this->cipher('hi'))->assertNotFound();
    }

    // ---------------------------------------------------------------- group rules

    public function test_creating_a_group_makes_the_creator_its_moderator(): void
    {
        [$creator, $other] = User::factory()->count(2)->create();

        $this->actingAs($creator)->post('/team-chat/groups', [
            'name' => 'Sori project',
            'visibility' => 'private',
            'members' => [$other->id, $creator->id],
        ])->assertRedirect();

        $group = Conversation::first();

        $this->assertTrue($group->isModeratedBy($creator));
        $this->assertFalse($group->isModeratedBy($other));
        $this->assertTrue($group->hasMember($other));
        $this->assertSame(2, $group->members()->count());
        $this->assertSame(ConversationVisibility::Private, $group->visibility);
    }

    public function test_group_creation_is_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/team-chat/groups', ['name' => '', 'visibility' => 'secret'])
            ->assertSessionHasErrors(['name', 'visibility']);
    }

    public function test_private_groups_are_invisible_to_people_who_are_not_in_them(): void
    {
        [$moderator, $member, $outsider] = User::factory()->count(3)->create();
        $group = $this->group($moderator, [$member], name: 'Secret project');

        $this->actingAs($outsider)->get("/team-chat/{$group->id}")->assertNotFound();
        $this->actingAs($outsider)->postJson("/team-chat/{$group->id}/messages", $this->cipher('let me in'))->assertNotFound();
        $this->actingAs($outsider)->post("/team-chat/{$group->id}/join")->assertForbidden();

        $this->actingAs($outsider)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page
                ->has('sidebar.groups', 0)
                ->has('joinable', 0));

        $this->actingAs($member)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page->has('sidebar.groups', 1)->where('sidebar.groups.0.title', 'Secret project'));
    }

    public function test_administrators_get_no_special_access_to_private_groups(): void
    {
        $moderator = User::factory()->staff()->create();
        $admin = User::factory()->admin()->create();
        $group = $this->group($moderator);

        $this->actingAs($admin)->get("/team-chat/{$group->id}")->assertNotFound();
        $this->actingAs($admin)->delete("/team-chat/{$group->id}")->assertNotFound();
    }

    public function test_anyone_can_join_an_open_group_but_not_a_private_one(): void
    {
        [$moderator, $joiner] = User::factory()->count(2)->create();
        $open = $this->group($moderator, open: true, name: 'Everyone welcome');
        $private = $this->group($moderator, name: 'Invite only');

        $this->actingAs($joiner)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page
                ->has('joinable', 1)
                ->where('joinable.0.name', 'Everyone welcome')
                ->has('sidebar.groups', 0));

        // Not a member yet, so the thread itself stays closed.
        $this->actingAs($joiner)->get("/team-chat/{$open->id}")->assertNotFound();

        $this->actingAs($joiner)->post("/team-chat/{$open->id}/join")->assertRedirect("/team-chat/{$open->id}");
        $this->assertTrue($open->hasMember($joiner));
        $this->assertFalse($open->isModeratedBy($joiner));

        $this->actingAs($joiner)->post("/team-chat/{$open->id}/join")->assertForbidden();
        $this->actingAs($joiner)->post("/team-chat/{$private->id}/join")->assertForbidden();
        $this->assertFalse($private->hasMember($joiner));
    }

    public function test_a_second_open_group_with_the_same_name_is_refused(): void
    {
        [$first, $second] = User::factory()->count(2)->create();
        $this->group($first, open: true, name: 'Everyone welcome');

        foreach (['Everyone welcome', '  everyone WELCOME  '] as $name) {
            $this->actingAs($second)->post('/team-chat/groups', ['name' => $name, 'visibility' => 'open'])
                ->assertSessionHasErrors('name');
        }

        $this->assertSame(1, Conversation::count());
    }

    public function test_private_groups_may_share_a_name_with_anything(): void
    {
        [$first, $second] = User::factory()->count(2)->create();
        $this->group($first, open: true, name: 'Lake team');

        $this->actingAs($second)->post('/team-chat/groups', ['name' => 'Lake team', 'visibility' => 'private'])
            ->assertSessionHasNoErrors();
        $this->actingAs($second)->post('/team-chat/groups', ['name' => 'Lake team', 'visibility' => 'private'])
            ->assertSessionHasNoErrors();

        $this->assertSame(3, Conversation::count());
    }

    public function test_renaming_an_open_group_cannot_collide_with_another_but_can_keep_its_own_name(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $one = $this->group($a, open: true, name: 'Alpha');
        $this->group($b, open: true, name: 'Beta');

        $this->actingAs($a)->patch("/team-chat/{$one->id}", ['name' => 'beta'])->assertSessionHasErrors('name');
        $this->actingAs($a)->patch("/team-chat/{$one->id}", ['name' => 'Alpha', 'description' => 'New text'])->assertSessionHasNoErrors();

        $this->assertSame('Alpha', $one->fresh()->name);
    }

    public function test_joining_an_open_group_adds_you_without_creating_another_group(): void
    {
        [$moderator, $joiner] = User::factory()->count(2)->create();
        $open = $this->group($moderator, open: true, name: 'Everyone welcome');

        $this->actingAs($joiner)->post("/team-chat/{$open->id}/join")->assertRedirect("/team-chat/{$open->id}");

        $this->assertSame(1, Conversation::count());
        $this->assertSame(2, $open->members()->count());

        $this->actingAs($joiner)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page->has('sidebar.groups', 1)->has('joinable', 0));
    }

    public function test_only_the_moderator_can_manage_a_group(): void
    {
        [$moderator, $member, $newcomer] = User::factory()->count(3)->create();
        $group = $this->group($moderator, [$member]);

        $this->actingAs($member)->patch("/team-chat/{$group->id}", ['name' => 'Mine now'])->assertForbidden();
        $this->actingAs($member)->post("/team-chat/{$group->id}/members", ['user_ids' => [$newcomer->id]])->assertForbidden();
        $this->actingAs($member)->delete("/team-chat/{$group->id}/members/{$moderator->id}")->assertForbidden();
        $this->actingAs($member)->delete("/team-chat/{$group->id}")->assertForbidden();

        $this->actingAs($moderator)->patch("/team-chat/{$group->id}", ['name' => 'Renamed', 'description' => 'About it'])->assertRedirect();
        $this->assertSame('Renamed', $group->fresh()->name);

        $this->actingAs($moderator)->post("/team-chat/{$group->id}/members", ['user_ids' => [$newcomer->id]])->assertRedirect();
        $this->assertTrue($group->hasMember($newcomer));

        $this->actingAs($moderator)->delete("/team-chat/{$group->id}/members/{$member->id}")->assertRedirect();
        $this->assertFalse($group->hasMember($member));

        $this->actingAs($moderator)->delete("/team-chat/{$group->id}")->assertRedirect('/team-chat');
        $this->assertModelMissing($group);
    }

    public function test_the_moderator_cannot_be_removed_or_leave(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create();
        $group = $this->group($moderator, [$member]);

        $this->actingAs($moderator)->delete("/team-chat/{$group->id}/members/{$moderator->id}")->assertSessionHasErrors('member');
        $this->actingAs($moderator)->post("/team-chat/{$group->id}/leave")->assertForbidden();
        $this->assertTrue($group->isModeratedBy($moderator));

        $this->actingAs($member)->post("/team-chat/{$group->id}/leave")->assertRedirect('/team-chat');
        $this->assertFalse($group->hasMember($member));
    }

    public function test_adding_someone_twice_does_not_duplicate_them(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create();
        $group = $this->group($moderator, [$member]);

        $this->actingAs($moderator)->post("/team-chat/{$group->id}/members", ['user_ids' => [$member->id]])->assertRedirect();

        $this->assertSame(2, $group->members()->count());
    }

    // ---------------------------------------------------------------- messages

    public function test_a_member_can_send_a_message_and_gets_it_back(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create(['name' => 'Same Name']);
        $member->update(['name' => 'Grace Achieng']);
        $group = $this->group($moderator, [$member]);

        $this->actingAs($member)->postJson("/team-chat/{$group->id}/messages", $payload = $this->cipher('sealed text'))
            ->assertCreated()
            ->assertJsonPath('message.ciphertext', base64_encode('sealed text'))
            ->assertJsonPath('message.id', $payload['id'])
            ->assertJsonPath('message.author', 'Grace Achieng')
            ->assertJsonPath('message.user_id', $member->id)
            ->assertJsonPath('message.edited', false);

        $this->assertDatabaseHas('messages', ['conversation_id' => $group->id, 'user_id' => $member->id, 'ciphertext' => base64_encode('sealed text')]);
    }

    public function test_malformed_encrypted_messages_are_rejected(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $conversation = $this->dm($a, $b);

        foreach ([
            ['ciphertext' => ''],
            ['ciphertext' => 'not base64 !!'],
            ['ciphertext' => str_repeat('a', 32769)],
            ['iv' => ''],
            ['key_version' => 0],
            ['key_version' => 99],
            ['id' => 'not-a-uuid'],
        ] as $broken) {
            $this->actingAs($a)
                ->postJson("/team-chat/{$conversation->id}/messages", array_merge($this->cipher(), $broken))
                ->assertStatus(422);
        }

        // The old plaintext shape is no longer accepted at all.
        $this->actingAs($a)->postJson("/team-chat/{$conversation->id}/messages", ['body' => 'plain text'])->assertStatus(422);

        $this->assertSame(0, Message::count());
    }

    public function test_the_conversation_loads_every_message_in_order_with_its_author(): void
    {
        [$a, $b, $c] = User::factory()->count(3)->create();
        $group = $this->group($a, [$b, $c]);

        foreach (range(1, 120) as $i) {
            $this->say($group, [$a, $b, $c][$i % 3], "message {$i}");
        }

        $this->actingAs($b)->get("/team-chat/{$group->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->has('conversation.messages', 120)
                ->where('conversation.messages.0.ciphertext', base64_encode('message 1'))
                ->where('conversation.messages.119.ciphertext', base64_encode('message 120'))
                ->where('conversation.messages.0.seq', 1)
                ->where('conversation.messages.119.seq', 120)
                ->where('conversation.messages.0.author', $b->name)
                ->has('conversation.messages.0', fn (Assert $m) => $m
                    ->hasAll(['id', 'seq', 'conversation_id', 'user_id', 'sender_id', 'author', 'ciphertext', 'iv', 'key_version', 'deleted', 'edited', 'created_at'])));
    }

    public function test_only_the_author_can_edit_a_message(): void
    {
        [$moderator, $member] = User::factory()->count(2)->create();
        $group = $this->group($moderator, [$member]);
        $message = $this->say($group, $member, 'original');

        $this->actingAs($moderator)->patchJson("/team-chat/messages/{$message->id}", $this->cipher('hijacked'))->assertForbidden();
        $this->actingAs($member)->patchJson("/team-chat/messages/{$message->id}", $this->cipher('fixed typo'))
            ->assertOk()
            ->assertJsonPath('message.ciphertext', base64_encode('fixed typo'))
            ->assertJsonPath('message.edited', true);

        $this->assertSame(base64_encode('fixed typo'), $message->fresh()->ciphertext);
        $this->assertNotNull($message->fresh()->edited_at);
    }

    public function test_authors_and_moderators_can_delete_but_other_members_cannot(): void
    {
        [$moderator, $author, $bystander] = User::factory()->count(3)->create();
        $group = $this->group($moderator, [$author, $bystander]);

        $mine = $this->say($group, $author, 'mine');
        $theirs = $this->say($group, $author, 'theirs');

        $this->actingAs($bystander)->deleteJson("/team-chat/messages/{$mine->id}")->assertForbidden();

        $this->actingAs($author)->deleteJson("/team-chat/messages/{$mine->id}")
            ->assertOk()->assertJsonPath('message.deleted', true)->assertJsonPath('message.ciphertext', null);
        $this->assertSoftDeleted($mine);
        $this->assertSame('', Message::withTrashed()->find($mine->id)->ciphertext, 'the encrypted text is wiped too');

        $this->actingAs($moderator)->deleteJson("/team-chat/messages/{$theirs->id}")->assertOk();
        $this->assertSoftDeleted($theirs);
    }

    public function test_a_moderator_of_one_group_cannot_touch_messages_in_another(): void
    {
        [$mod1, $mod2, $author] = User::factory()->count(3)->create();
        $groupOne = $this->group($mod1);
        $groupTwo = $this->group($mod2, [$author]);
        $message = $this->say($groupTwo, $author);

        $this->actingAs($mod1)->deleteJson("/team-chat/messages/{$message->id}")->assertForbidden();
    }

    public function test_deleted_messages_stay_in_the_thread_without_their_text(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $conversation = $this->dm($a, $b);
        $this->say($conversation, $a, 'secret words');
        $gone = $this->say($conversation, $b, 'oops');
        $gone->delete();

        $this->actingAs($a)->get("/team-chat/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->has('conversation.messages', 2)
                ->where('conversation.messages.1.deleted', true)
                ->where('conversation.messages.1.ciphertext', null));

        $this->actingAs($b)->patchJson("/team-chat/messages/{$gone->id}", $this->cipher('undelete'))->assertNotFound();
    }

    // ---------------------------------------------------------------- unread

    public function test_unread_counts_follow_what_you_have_not_seen(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $conversation = $this->dm($a, $b);

        $this->say($conversation, $b, 'one');
        $this->say($conversation, $b, 'two');
        $this->say($conversation, $a, 'my own does not count');

        $this->actingAs($a)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page
                ->where('sidebar.direct.0.unread', 2)
                ->where('team.unreadMessages', 2));

        $this->actingAs($a)->get("/team-chat/{$conversation->id}")
            ->assertInertia(fn (Assert $page) => $page->where('team.unreadMessages', 0));
    }

    public function test_history_before_you_joined_is_not_unread(): void
    {
        [$moderator, $joiner] = User::factory()->count(2)->create();
        $open = $this->group($moderator, open: true);
        $this->say($open, $moderator, 'old news');

        $this->actingAs($joiner)->post("/team-chat/{$open->id}/join");

        $this->actingAs($joiner)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page->where('sidebar.groups.0.unread', 0));
    }

    // ---------------------------------------------------------------- realtime

    public function test_sending_editing_and_deleting_are_broadcast(): void
    {
        Event::fake([MessageCreated::class, MessageUpdated::class, MessageDeleted::class]);

        [$a, $b] = User::factory()->count(2)->create();
        $conversation = $this->dm($a, $b);

        $id = $this->actingAs($a)->postJson("/team-chat/{$conversation->id}/messages", $this->cipher('hi'))->json('message.id');
        $this->actingAs($a)->patchJson("/team-chat/messages/{$id}", $this->cipher('hi again'));
        $this->actingAs($a)->deleteJson("/team-chat/messages/{$id}");

        Event::assertDispatched(MessageCreated::class, fn ($e) => $e->broadcastOn()[0]->name === "private-conversations.{$conversation->id}");
        Event::assertDispatched(MessageUpdated::class);
        Event::assertDispatched(MessageDeleted::class);
    }

    public function test_a_broken_websocket_server_never_loses_a_message(): void
    {
        Event::listen(MessageCreated::class, fn () => throw new \RuntimeException('Reverb is down'));

        [$a, $b] = User::factory()->count(2)->create();
        $conversation = $this->dm($a, $b);

        $this->actingAs($a)->postJson("/team-chat/{$conversation->id}/messages", $this->cipher('still saved'))->assertCreated();

        $this->assertDatabaseHas('messages', ['ciphertext' => base64_encode('still saved')]);
    }

    public function test_only_members_may_listen_to_a_conversation_channel(): void
    {
        [$a, $b, $outsider] = User::factory()->count(3)->create();
        $conversation = $this->dm($a, $b);

        $this->assertTrue($a->can('view', $conversation));
        $this->assertFalse($outsider->can('view', $conversation));
    }

    public function test_guests_are_sent_to_log_in(): void
    {
        $this->get('/team-chat')->assertRedirect('/login');
        $this->postJson('/team-chat/'.Str::uuid().'/messages', $this->cipher('x'))->assertUnauthorized();
    }
}
