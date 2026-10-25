<?php

namespace App\Enums;

/** The creator of a group is its moderator. Everyone else is a member. */
enum MemberRole: string
{
    case Moderator = 'moderator';
    case Member = 'member';
}
