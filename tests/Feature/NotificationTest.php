<?php

namespace Tests\Feature;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Events\ChatNotificationCreated;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function send(User $from, Conversation $conversation, string $body): void
    {
        $this->actingAs($from)->postJson("/team-chat/{$conversation->id}/messages", ['body' => $body])->assertCreated();
    }

    public function test_a_message_notifies_everyone_except_its_sender(): void
    {
        $a = User::factory()->create(['name' => 'Ada']);
        [$b, $c] = User::factory()->count(2)->create();

        $group = new Conversation;
        $group->type = ConversationType::Group;
        $group->visibility = ConversationVisibility::Private;
        $group->name = 'Project X';
        $group->created_by = $a->id;
        $group->save();
        foreach ([$a, $b, $c] as $user) {
            $group->members()->attach($user->id, ['role' => $user->is($a) ? MemberRole::Moderator->value : MemberRole::Member->value]);
        }

        $this->send($a, $group, 'Kick-off at nine');

        $this->assertSame(0, $a->notifications()->count());
        $this->assertSame(1, $b->notifications()->count());
        $this->assertSame(1, $c->notifications()->count());

        $data = $b->notifications()->first()->data;
        $this->assertSame('message', $data['kind']);
        $this->assertSame('Project X', $data['title']);
        $this->assertSame('Ada', $data['sender']);
        $this->assertSame('Kick-off at nine', $data['preview']);
        $this->assertSame("/team-chat/{$group->id}", $data['url']);
    }

    public function test_several_unread_messages_collapse_into_one_notification(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $conversation = Conversation::directBetween($a, $b);

        $this->send($a, $conversation, 'one');
        $this->send($a, $conversation, 'two');
        $this->send($a, $conversation, 'three');

        $this->assertSame(1, $b->notifications()->count());
        $this->assertSame(3, $b->notifications()->first()->data['count']);
        $this->assertSame('three', $b->notifications()->first()->data['preview']);
    }

    public function test_the_notification_is_pushed_to_the_recipients_private_channel(): void
    {
        Event::fake([ChatNotificationCreated::class]);

        [$a, $b] = User::factory()->count(2)->create();
        $conversation = Conversation::directBetween($a, $b);

        $this->send($a, $conversation, 'ping');

        Event::assertDispatched(ChatNotificationCreated::class, fn ($e) => $e->userId === $b->id
            && $e->broadcastOn()[0]->name === "private-App.Models.User.{$b->id}"
            && $e->notification['data']['preview'] === 'ping');
        Event::assertNotDispatched(ChatNotificationCreated::class, fn ($e) => $e->userId === $a->id);
    }

    public function test_opening_the_conversation_marks_its_notifications_read(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $one = Conversation::directBetween($a, $b);
        $c = User::factory()->create();
        $two = Conversation::directBetween($c, $b);

        $this->send($a, $one, 'from a');
        $this->send($c, $two, 'from c');
        $this->assertSame(2, $b->unreadNotifications()->count());

        $this->actingAs($b)->get("/team-chat/{$one->id}")->assertOk();

        $this->assertSame(1, $b->fresh()->unreadNotifications()->count());
        $this->assertSame($two->id, $b->unreadNotifications()->first()->data['conversation_id']);
    }

    public function test_the_bell_lists_only_my_notifications(): void
    {
        [$a, $b, $c] = User::factory()->count(3)->create();
        $this->send($a, Conversation::directBetween($a, $b), 'for b');
        $this->send($a, Conversation::directBetween($a, $c), 'for c');

        $this->actingAs($b)->getJson('/notifications')
            ->assertOk()
            ->assertJsonPath('unread', 1)
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.data.preview', 'for b')
            ->assertJsonPath('items.0.read', false);
    }

    public function test_reading_and_reading_everything(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $c = User::factory()->create();
        $this->send($a, Conversation::directBetween($a, $b), 'one');
        $this->send($c, Conversation::directBetween($c, $b), 'two');

        $first = $b->notifications()->first();

        $this->actingAs($b)->postJson("/notifications/{$first->id}/read")->assertNoContent();
        $this->assertSame(1, $b->unreadNotifications()->count());

        $this->actingAs($b)->postJson('/notifications/read-all')->assertNoContent();
        $this->assertSame(0, $b->unreadNotifications()->count());
    }

    public function test_you_cannot_read_someone_elses_notification(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $this->send($a, Conversation::directBetween($a, $b), 'private');
        $theirs = $b->notifications()->first();

        $this->actingAs($a)->postJson("/notifications/{$theirs->id}/read")->assertNotFound();
        $this->assertNull($theirs->fresh()->read_at);
    }

    public function test_being_added_to_and_removed_from_a_group_notifies_you(): void
    {
        [$moderator, $newcomer] = User::factory()->count(2)->create();

        $this->actingAs($moderator)->post('/team-chat/groups', ['name' => 'Fresh group', 'visibility' => 'private', 'members' => [$newcomer->id]]);
        $group = Conversation::first();

        $added = $newcomer->notifications()->first()->data;
        $this->assertSame('added', $added['kind']);
        $this->assertSame("/team-chat/{$group->id}", $added['url']);
        $this->assertSame(0, $moderator->notifications()->count());

        $this->actingAs($moderator)->delete("/team-chat/{$group->id}/members/{$newcomer->id}");

        $removed = $newcomer->notifications()->get()->first(fn ($n) => $n->data['kind'] === 'removed');
        $this->assertNotNull($removed);
        $this->assertNull($removed->data['url']);
    }

    public function test_shared_props_carry_the_badge_and_websocket_settings_only_for_signed_in_people(): void
    {
        config(['chat.client' => ['enabled' => true, 'key' => 'abc', 'host' => 'example.test', 'port' => 443, 'scheme' => 'https']]);

        $user = User::factory()->create();

        $this->actingAs($user)->get('/team-chat')
            ->assertInertia(fn (Assert $page) => $page
                ->where('realtime.enabled', true)
                ->where('realtime.key', 'abc')
                ->has('realtime.pollSeconds')
                ->has('team.unreadMessages'));

        auth()->logout();

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('realtime', null)->where('team', null));
    }
}
