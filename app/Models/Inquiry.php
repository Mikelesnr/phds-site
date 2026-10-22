<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inquiry extends Model
{
    public const TYPE_CONTACT = 'contact';

    public const TYPE_NEWSLETTER = 'newsletter';

    protected $fillable = [
        'type',
        'name',
        'email',
        'organisation',
        'interest',
        'message',
    ];
}
