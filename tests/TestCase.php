<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Page tests check what the server sends, not the compiled assets, so
        // they pass without running `npm run build` first.
        $this->withoutVite();
    }
}
