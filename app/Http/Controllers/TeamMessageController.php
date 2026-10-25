<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Chat\ChatNotifier;
use App\Services\Chat\ChatPresenter;
use App\Services\Chat\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Sending, editing and deleting messages. Answers with JSON so the browser can
 * update at once, while everyone else gets the same change by broadcast.
 */
class TeamMessageController extends Controller
{
    public function __construct(
        private readonly ChatNotifier $notifier,
        private readonly ChatPresenter $chat,
    ) {}

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless($request->user()->can('view', $conversation), 404);
        Gate::authorize('sendMessage', $conversation);

        $body = $this->validatedBody($request);

        $message = new Message(['body' => $body]);
        $message->conversation_id = $conversation->id;
        $message->user_id = $request->user()->id;
        $message->save();
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

        $message->body = $this->validatedBody($request);
        $message->edited_at = now();
        $message->save();

        Realtime::send(new MessageUpdated($message), toOthers: true);

        return response()->json(['message' => $message->toChatArray()]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        Gate::authorize('delete', $message);

        $message->delete();

        Realtime::send(new MessageDeleted($message), toOthers: true);

        return response()->json(['message' => $message->toChatArray()]);
    }

    private function validatedBody(Request $request): string
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:'.config('chat.message_max')],
        ]);

        $body = trim($data['body']);

        abort_if($body === '', 422, 'A message cannot be empty.');

        return $body;
    }
}
