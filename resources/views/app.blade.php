<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Apply the saved or system theme before first paint to avoid a flash --}}
        <script>
            (function () {
                try {
                    var saved = localStorage.getItem('phds-theme');
                    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.classList.toggle('dark', dark);
                    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                } catch (e) {}
            })();
        </script>

        <title inertia>{{ config('phds.name') }}</title>
        <meta name="description" content="{{ config('phds.mission') }}">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="bg-background font-sans text-foreground antialiased">
        @inertia
    </body>
</html>
