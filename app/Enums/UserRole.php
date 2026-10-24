<?php

namespace App\Enums;

/**
 * Roles a user can hold.
 *
 * The database stores the role as a plain string. This enum is the guard:
 * models cast to it and controllers check against it, so adding a role later
 * is one new case here and no schema change.
 */
enum UserRole: string
{
    case Admin = 'admin';
    case Staff = 'staff';

    /** Role given to new users unless told otherwise. */
    public static function default(): self
    {
        return self::Staff;
    }

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Staff => 'Staff',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
