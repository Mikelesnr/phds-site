<?php

namespace App\Enums;

/** Stored as a plain string, the enum is the guard. */
enum ConversationType: string
{
    case Direct = 'direct';
    case Group = 'group';
}
