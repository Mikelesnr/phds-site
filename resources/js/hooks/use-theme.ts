import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'phds-theme';

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
}

/**
 * Light and dark mode. The first paint is handled by an inline script in
 * app.blade.php; this hook keeps React in sync and saves explicit choices.
 * Until the visitor picks a theme, the operating system preference wins.
 */
export function useTheme() {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        setTheme(
            document.documentElement.classList.contains('dark')
                ? 'dark'
                : 'light',
        );

        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemChange = (event: MediaQueryListEvent) => {
            try {
                if (localStorage.getItem(STORAGE_KEY)) return;
            } catch {
                // storage unavailable, fall through to the system preference
            }
            const next: Theme = event.matches ? 'dark' : 'light';
            applyTheme(next);
            setTheme(next);
        };

        query.addEventListener('change', onSystemChange);
        return () => query.removeEventListener('change', onSystemChange);
    }, []);

    const toggle = useCallback(() => {
        const next: Theme = document.documentElement.classList.contains('dark')
            ? 'light'
            : 'dark';
        applyTheme(next);
        setTheme(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // private mode, the choice just will not persist
        }
    }, []);

    return { theme, toggle };
}
