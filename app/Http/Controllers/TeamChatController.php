<?php

namespace App\Http\Controllers;

use App\Enums\ConversationType;
use App\Enums\ConversationVisibility;
use App\Enums\MemberRole;
use App\Events\ConversationChanged;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Chat\ChatNotifier;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\Realtime;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TeamChatController extends Controller
{
    public function __construct(
        private readonly ChatPresenter $chat,
        private readonly ChatNotifier $notifier,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        return $this->render($request, null);
    }

    public function show(Request $request, Conversation $conversation): InertiaResponse
    {
        $this->mustBeAbleToView($request, $conversation);

        $this->chat->markRead($request->user(), $conversation);
        $this->notifier->markConversationRead($request->user(), $conversation->id);

        return $this->render($request, $conversation);
    }

    /** Start, or reopen, the one direct chat between two people. */
    public function storeDirect(Request $request): RedirectResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        abort_if((int) $data['user_id'] === $request->user()->id, 422, 'You cannot message yourself.');

        $conversation = Conversation::directBetween($request->user(), User::findOrFail($data['user_id']));

        return to_route('team.chat.show', $conversation);
    }

    /** Create a group. The creator becomes its moderator. */
    public function storeGroup(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:300'],
            'visibility' => ['required', Rule::enum(ConversationVisibility::class)],
            'members' => ['nullable', 'array', 'max:100'],
            'members.*' => ['integer', 'exists:users,id'],
        ]);

        $creator = $request->user();

        $conversation = DB::transaction(function () use ($data, $creator) {
            $conversation = new Conversation;
            $conversation->type = ConversationType::Group;
            $conversation->visibility = ConversationVisibility::from($data['visibility']);
            $conversation->name = trim($data['name']);
            $conversation->description = $data['description'] ?? null;
            $conversation->created_by = $creator->id;
            $conversation->save();

            $conversation->members()->attach($creator->id, [
                'role' => MemberRole::Moderator->value,
                'last_read_at' => now(),
            ]);

            $others = collect($data['members'] ?? [])->map(fn ($id) => (int) $id)->unique()->reject(fn ($id) => $id === $creator->id);

            $conversation->members()->attach(
                $others->mapWithKeys(fn ($id) => [$id => ['role' => MemberRole::Member->value, 'last_read_at' => now()]])->all(),
            );

            return $conversation;
        });

        User::query()->whereKey($conversation->members()->pluck('users.id')->all())
            ->whereKeyNot($creator->id)
            ->get()
            ->each(fn (User $added) => $this->notifier->addedToGroup($conversation, $added, $creator));

        return to_route('team.chat.show', $conversation);
    }

    public function updateGroup(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->mustBeAbleToView($request, $conversation);
        Gate::authorize('moderate', $conversation);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:300'],
        ]);

        $conversation->fill(['name' => trim($data['name']), 'description' => $data['description'] ?? null])->save();

        Realtime::send(new ConversationChanged($conversation->id, 'details'), toOthers: true);

        return back();
    }

    public function destroyGroup(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->mustBeAbleToView($request, $conversation);
        Gate::authorize('moderate', $conversation);

        $members = $conversation->members()->pluck('users.id');
        $id = $conversation->id;

        $conversation->delete();

        Realtime::send(new ConversationChanged($id, 'deleted'), toOthers: true);

        return to_route('team.chat.index');
    }

    /** Anyone signed in can join an open group. */
    public function join(Request $request, Conversation $conversation): RedirectResponse
    {
        Gate::authorize('join', $conversation);

        // Joining starts at "now": the history is not shown as unread.
        $conversation->members()->attach($request->user()->id, [
            'role' => MemberRole::Member->value,
            'last_read_at' => now(),
        ]);

        Realtime::send(new ConversationChanged($conversation->id, 'members'), toOthers: true);

        return to_route('team.chat.show', $conversation);
    }

    public function leave(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->mustBeAbleToView($request, $conversation);
        Gate::authorize('leave', $conversation);

        $conversation->members()->detach($request->user()->id);

        Realtime::send(new ConversationChanged($conversation->id, 'members'), toOthers: true);

        return to_route('team.chat.index');
    }

    /** The moderator adds people. This is how private groups get their members. */
    public function addMembers(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->mustBeAbleToView($request, $conversation);
        Gate::authorize('moderate', $conversation);

        $data = $request->validate([
            'user_ids' => ['required', 'array', 'min:1', 'max:100'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $existing = $conversation->members()->pluck('users.id');

        $new = User::query()
            ->whereKey(collect($data['user_ids']))
            ->get()
            ->reject(fn (User $user) => $existing->contains($user->id));

        foreach ($new as $user) {
            $conversation->members()->attach($user->id, [
                'role' => MemberRole::Member->value,
                'last_read_at' => now(),
            ]);

            $this->notifier->addedToGroup($conversation, $user, $request->user());
        }

        Realtime::send(new ConversationChanged($conversation->id, 'members'), toOthers: true);

        return back();
    }

    public function removeMember(Request $request, Conversation $conversation, User $user): RedirectResponse
    {
        $this->mustBeAbleToView($request, $conversation);
        Gate::authorize('moderate', $conversation);

        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'member' => 'A moderator cannot be removed. Delete the group instead.',
            ]);
        }

        $conversation->members()->detach($user->id);

        $this->notifier->removedFromGroup($conversation, $user);
        Realtime::send(new ConversationChanged($conversation->id, 'members'), toOthers: true);

        return back();
    }

    /** Called by the browser when a message arrives in the chat that is open. */
    public function markRead(Request $request, Conversation $conversation): Response
    {
        $this->mustBeAbleToView($request, $conversation);

        $this->chat->markRead($request->user(), $conversation);
        $this->notifier->markConversationRead($request->user(), $conversation->id);

        return response()->noContent();
    }

    private function render(Request $request, ?Conversation $conversation): InertiaResponse
    {
        $user = $request->user();

        return Inertia::render('Chat/Index', [
            'sidebar' => $this->chat->sidebar($user),
            'conversation' => $conversation ? $this->chat->conversation($user, $conversation) : null,
            'people' => $this->chat->people($user),
            'joinable' => $this->chat->joinableGroups($user),
        ]);
    }

    /** A chat you are not in does not exist as far as you are concerned. */
    private function mustBeAbleToView(Request $request, Conversation $conversation): void
    {
        abort_unless($request->user()->can('view', $conversation), 404);
    }
}
