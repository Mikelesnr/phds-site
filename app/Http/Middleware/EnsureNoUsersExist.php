<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Registration creates administrators, so it is only open until the first
 * account exists. After that the register address returns a 404 and further
 * staff accounts are added by an administrator.
 */
class EnsureNoUsersExist
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(User::query()->exists(), 404);

        return $next($request);
    }
}
