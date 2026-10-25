<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Services\Chat\ChatCleanup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        return Inertia::render('Admin/Users/Index', [
            'users' => User::query()
                ->withCount('blogs')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'blogs_count' => $user->blogs_count,
                    'created_at' => $user->created_at?->format('j M Y'),
                    'is_me' => $user->id === $request->user()->id,
                ]),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', User::class);

        return Inertia::render('Admin/Users/Form', [
            'user' => null,
            'roles' => $this->roles(),
        ]);
    }

    public function store(UserRequest $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        $data = $request->validated();

        $user = new User;
        $user->forceFill([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'role' => UserRole::from($data['role']),
            'password' => $data['password'],
            'email_verified_at' => now(),
        ])->save();

        return to_route('admin.users.index')->with('success', "{$user->name} was added.");
    }

    public function edit(Request $request, User $user): Response
    {
        Gate::authorize('update', $user);

        return Inertia::render('Admin/Users/Form', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'is_me' => $user->id === $request->user()->id,
            ],
            'roles' => $this->roles(),
        ]);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        $data = $request->validated();

        // Nobody can demote themselves, so the site is never left without an administrator.
        if ($user->id === $request->user()->id && $data['role'] !== $user->role->value) {
            throw ValidationException::withMessages(['role' => 'You cannot change your own role.']);
        }

        $user->forceFill([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'role' => UserRole::from($data['role']),
        ]);

        if (filled($data['password'] ?? null)) {
            $user->password = $data['password'];
        }

        $user->save();

        return to_route('admin.users.index')->with('success', "{$user->name} was updated.");
    }

    public function destroy(User $user, ChatCleanup $cleanup): RedirectResponse
    {
        Gate::authorize('delete', $user);

        $cleanup->forgetUser($user);
        $name = $user->name;
        $user->delete();

        return to_route('admin.users.index')->with('success', "{$name} was removed.");
    }

    /** @return list<array{value: string, label: string}> */
    private function roles(): array
    {
        return collect(UserRole::cases())
            ->map(fn (UserRole $role) => ['value' => $role->value, 'label' => $role->label()])
            ->all();
    }
}
