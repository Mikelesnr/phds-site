<?php

namespace App\Services\Chatbot;

use RuntimeException;

/** Raised when Gemini cannot be reached or returns nothing usable. */
class ChatbotUnavailable extends RuntimeException {}
