<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\ConversationKey;
use App\Models\UserKey;
use App\Events\ConversationChanged;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Holds the pieces of end-to-end encryption that the server is allowed to hold:
 * public keys, a private key that only the owner's passphrase can open, and
 * conversation keys that are sealed for each member. It never sees a usable key,
 * a passphrase or any message text.
 */
class ChatKeyController extends Controller
{
    public function __construct(private readonly ChatPresenter $chat) {}

    /** My identity: enough for a new device to ask for my passphrase and unlock it. */
    public function me(Request $request): JsonResponse
    {
        $key = UserKey::query()->where('user_id', $request->user()->id)->first();

        return response()->json([
            'exists' => $key !== null,
            'public_key' => $key?->public_key,
            'encrypted_private_key' => $key?->encrypted_private_key,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedIdentity($request);

        if ($request->user()->chatKey()->exists()) {
            return response()->json(['message' => 'Chat keys already exist. Use reset to replace them.'], 409);
        }

        $request->user()->chatKey()->create($data);

        return response()->json(['exists' => true], 201);
    }

    /**
     * For someone who forgot their chat passphrase. A new identity replaces the old one.
     * Messages they could read before stay unreadable to them until another member
     * of each conversation shares the key with their new identity.
     */
    public function reset(Request $request): JsonResponse
    {
        $data = $this->validatedIdentity($request);
        $user = $request->user();

        DB::transaction(function () use ($user, $data) {
            $user->chatKey()->delete();
            ConversationKey::query()->where('user_id', $user->id)->delete();
            $user->chatKey()->create($data);
        });

        return response()->json(['exists' => true]);
    }

    /** Keys for one conversation, used to open it or to forward into it. */
    public function conversation(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 404);

        return response()->json($this->chat->crypto($request->user(), $conversation));
    }

    /**
     * Share conversation keys with members.
     *
     * - The first key for a version ("bootstrap") may only be created by the
     *   moderator of a group, or either person in a direct chat, and it must
     *   include their own copy so whoever starts it can read it.
     * - After that, only someone who already holds the key may share it, and
     *   only where the conversation's rules allow: anyone in a direct chat or an
     *   open group, the moderator in a private group.
     */
    public function grant(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 404);

        $data = $request->validate([
            'keys' => ['required', 'array', 'min:1', 'max:200'],
            'keys.*.user_id' => ['required', 'uuid'],
            'keys.*.version' => ['required', 'integer', 'min:1'],
            'keys.*.wrapped_key' => ['required', 'string', 'max:2048'],
        ]);

        $actor = $request->user();

        DB::transaction(function () use ($data, $actor, $conversation) {
            // One at a time per conversation, so two people cannot both start the same key.
            $locked = Conversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();
            $memberIds = $locked->members()->pluck('users.id')->all();

            foreach (collect($data['keys'])->groupBy('version') as $version => $entries) {
                abort_if($version > $locked->key_version, 422, 'That key version does not exist yet.');

                $existing = ConversationKey::query()
                    ->where('conversation_id', $locked->id)
                    ->where('key_version', $version);

                if (! $existing->exists()) {
                    abort_unless($this->mayStartKey($actor, $locked), 403);
                    abort_unless($entries->contains('user_id', $actor->id), 422, 'Include your own copy of the key.');
                } else {
                    $holdsIt = (clone $existing)->where('user_id', $actor->id)->exists();
                    abort_unless($holdsIt, 409, 'This key was already started by someone else. Reload to receive it.');
                    abort_unless($this->maySharekey($actor, $locked), 403);
                }

                foreach ($entries as $entry) {
                    abort_unless(in_array($entry['user_id'], $memberIds, true), 422, 'You can only share keys with members.');

                    ConversationKey::query()->firstOrCreate(
                        [
                            'conversation_id' => $locked->id,
                            'user_id' => $entry['user_id'],
                            'key_version' => $version,
                        ],
                        [
                            'wrapped_key' => $entry['wrapped_key'],
                            'granted_by' => $actor->id,
                        ],
                    );
                }
            }
        });

        // Tell the others so anyone waiting for a key picks it up straight away.
        Realtime::send(new ConversationChanged($conversation->id, 'keys'), toOthers: true);

        return response()->json($this->chat->crypto($actor, $conversation->refresh()), 201);
    }

    private function mayStartKey($actor, Conversation $conversation): bool
    {
        return $conversation->isDirect() || $conversation->isModeratedBy($actor);
    }

    private function maySharekey($actor, Conversation $conversation): bool
    {
        return $conversation->isDirect()
            || $conversation->isOpen()
            || $conversation->isModeratedBy($actor);
    }

    /** @return array{public_key: string, encrypted_private_key: string} */
    private function validatedIdentity(Request $request): array
    {
        return $request->validate([
            'public_key' => ['required', 'string', 'max:512', 'regex:/^[A-Za-z0-9+\/=_-]+$/'],
            'encrypted_private_key' => ['required', 'string', 'max:8192'],
        ]);
    }
}
