<?php

namespace App\Enums;

/**
 * Open groups can be joined by any signed-in person. Private groups are
 * visible only to the people who were added to them.
 */
enum ConversationVisibility: string
{
    case Open = 'open';
    case Private = 'private';
}
