<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Conversation;
use App\Models\ConversationKey;
use App\Models\Message;
use App\Services\Chat\ChatNotifier;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\Realtime;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Sending, editing and deleting messages. The browser encrypts before it sends,
 * so everything here is ciphertext: this controller cannot read a single message.
 */
class TeamMessageController extends Controller
{
    public function __construct(
        private readonly ChatNotifier $notifier,
        private readonly ChatPresenter $chat,
    ) {}

    /**
     * The id is chosen by the sender, and the text is encrypted against it, so
     * sending the same message twice (a retry after a bad connection) is safe:
     * the second time you simply get the first one back.
     */
    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 404);
        Gate::authorize('sendMessage', $conversation);

        $data = $request->validate(['id' => ['required', 'uuid'], ...$this->envelopeRules()]);
        $this->ensureSenderHoldsKey($request, $conversation, (int) $data['key_version']);

        $existing = Message::withTrashed()->find($data['id']);

        if ($existing) {
            abort_unless(
                $existing->user_id === $request->user()->id && $existing->conversation_id === $conversation->id,
                409,
                'That message id is already in use.',
            );

            return response()->json(['message' => $existing->load('author:id,name')->toChatArray()]);
        }

        $message = $this->saveWithNextSequence($data, $conversation, $request);
        $message->setRelation('author', $request->user());
        $message->setRelation('conversation', $conversation);

        // Whoever writes has, by definition, read the thread up to here.
        $this->chat->markRead($request->user(), $conversation);

        Realtime::send(new MessageCreated($message), toOthers: true);
        $this->notifier->messagePosted($message);

        return response()->json(['message' => $message->toChatArray()], 201);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('update', $message);

        $data = $request->validate($this->envelopeRules());
        $this->ensureSenderHoldsKey($request, $message->conversation, (int) $data['key_version']);

        $message->forceFill([
            'ciphertext' => $data['ciphertext'],
            'iv' => $data['iv'],
            'key_version' => $data['key_version'],
            'edited_at' => now(),
        ])->save();

        Realtime::send(new MessageUpdated($message), toOthers: true);

        return response()->json(['message' => $message->toChatArray()]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('delete', $message);

        $message->redact();

        Realtime::send(new MessageDeleted($message), toOthers: true);

        return response()->json(['message' => $message->toChatArray()]);
    }

    /** @return array<string, list<string>> */
    private function envelopeRules(): array
    {
        return [
            'ciphertext' => ['required', 'string', 'max:32768', 'regex:/^[A-Za-z0-9+\/=_-]+$/'],
            'iv' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9+\/=_-]+$/'],
            'key_version' => ['required', 'integer', 'min:1'],
        ];
    }

    /** You can only write with a key you actually hold, and it must exist. */
    private function ensureSenderHoldsKey(Request $request, Conversation $conversation, int $version): void
    {
        abort_if($version > $conversation->key_version, 422, 'That key version does not exist.');

        $holds = ConversationKey::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $request->user()->id)
            ->where('key_version', $version)
            ->exists();

        abort_unless($holds, 422, 'You do not hold that encryption key yet.');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function saveWithNextSequence(array $data, Conversation $conversation, Request $request): Message
    {
        for ($attempt = 1; ; $attempt++) {
            $message = new Message;
            $message->id = $data['id'];
            $message->conversation_id = $conversation->id;
            $message->user_id = $request->user()->id;
            $message->sender_id = $request->user()->id;
            $message->ciphertext = $data['ciphertext'];
            $message->iv = $data['iv'];
            $message->key_version = $data['key_version'];

            try {
                $message->save();

                return $message;
            } catch (UniqueConstraintViolationException $e) {
                // Two messages took the same place at once. Try again for the next one.
                if ($attempt >= 5) {
                    throw $e;
                }
            }
        }
    }
}
