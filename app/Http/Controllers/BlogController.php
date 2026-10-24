<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\BlogRequest;
use App\Models\Blog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    /**
     * Public blog page, paginated with Laravel's built-in paginator.
     */
    public function index(): Response
    {
        $posts = Blog::published()
            ->with('author:id,name')
            ->latest('published_at')
            ->paginate(9)
            ->through(fn (Blog $blog) => $blog->toPublicArray());

        return Inertia::render('Blogs', ['posts' => $posts]);
    }

    /**
     * Back office list. Admins and staff can see it.
     */
    public function manage(Request $request): Response
    {
        $user = $this->verify($request, UserRole::Admin, UserRole::Staff);

        $posts = Blog::with('author:id,name')
            ->latest('updated_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Blog $blog) => [
                'id' => $blog->id,
                'title' => $blog->title,
                'is_featured' => $blog->is_featured,
                'status' => $blog->isPublished() ? 'published' : 'draft',
                'published_label' => $blog->published_at?->format('j M Y'),
                'updated_label' => $blog->updated_at->format('j M Y'),
                'author' => $blog->author?->name,
            ]);

        return Inertia::render('Admin/Blogs/Index', [
            'posts' => $posts,
            'canManageFeatured' => $user->hasRole(UserRole::Admin),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $this->verify($request, UserRole::Admin, UserRole::Staff);

        return Inertia::render('Admin/Blogs/Form', [
            'blog' => null,
            'canManageFeatured' => $user->hasRole(UserRole::Admin),
        ]);
    }

    public function store(BlogRequest $request): RedirectResponse
    {
        $user = $this->verify($request, UserRole::Admin, UserRole::Staff);
        $data = $request->validated();

        $blog = new Blog([
            'title' => $data['title'],
            'excerpt' => $data['excerpt'],
            'body' => $data['body'],
            'images' => array_values($data['images'] ?? []),
            'videos' => array_values($data['videos'] ?? []),
        ]);

        $blog->user_id = $user->id;
        $blog->published_at = ($data['publish'] ?? false) ? now() : null;
        // Only admins decide what is featured. Staff input is ignored.
        $blog->is_featured = $user->hasRole(UserRole::Admin) && ($data['is_featured'] ?? false);
        $blog->save();

        return to_route('admin.blogs.index')->with('success', 'Post saved.');
    }

    public function edit(Request $request, Blog $blog): Response
    {
        $user = $this->verify($request, UserRole::Admin, UserRole::Staff);

        return Inertia::render('Admin/Blogs/Form', [
            'blog' => [
                'id' => $blog->id,
                'title' => $blog->title,
                'excerpt' => $blog->excerpt,
                'body' => $blog->body,
                'images' => array_values($blog->images ?? []),
                'videos' => array_values($blog->videos ?? []),
                'is_featured' => $blog->is_featured,
                'published' => $blog->isPublished(),
            ],
            'canManageFeatured' => $user->hasRole(UserRole::Admin),
        ]);
    }

    public function update(BlogRequest $request, Blog $blog): RedirectResponse
    {
        $user = $this->verify($request, UserRole::Admin, UserRole::Staff);
        $data = $request->validated();

        $blog->fill([
            'title' => $data['title'],
            'excerpt' => $data['excerpt'],
            'body' => $data['body'],
            'images' => array_values($data['images'] ?? []),
            'videos' => array_values($data['videos'] ?? []),
        ]);

        $blog->published_at = ($data['publish'] ?? false) ? ($blog->published_at ?? now()) : null;

        if ($user->hasRole(UserRole::Admin)) {
            $blog->is_featured = (bool) ($data['is_featured'] ?? false);
        }

        $blog->save();

        return to_route('admin.blogs.index')->with('success', 'Post updated.');
    }

    public function toggleFeatured(Request $request, Blog $blog): RedirectResponse
    {
        $this->verify($request, UserRole::Admin);

        $blog->update(['is_featured' => ! $blog->is_featured]);

        return back()->with(
            'success',
            $blog->is_featured ? 'Post is now featured.' : 'Post removed from featured.',
        );
    }

    public function destroy(Request $request, Blog $blog): RedirectResponse
    {
        $this->verify($request, UserRole::Admin);

        $blog->delete();

        return to_route('admin.blogs.index')->with('success', 'Post deleted.');
    }

    /**
     * Abort with 403 unless the signed-in user holds one of the given roles.
     * The database stores roles as strings; UserRole keeps this check honest.
     */
    private function verify(Request $request, UserRole ...$roles): User
    {
        $user = $request->user();

        abort_unless($user instanceof User && $user->hasRole(...$roles), 403);

        return $user;
    }
}
