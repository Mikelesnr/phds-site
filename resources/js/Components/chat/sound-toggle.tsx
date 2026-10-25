import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playSound, setSoundEnabled, soundEnabled, unlockSound } from '@/lib/sound';

/** Mute or unmute chat sounds. Remembered in this browser. */
export function SoundToggle() {
    const [on, setOn] = useState(true);

    useEffect(() => {
        const sync = () => setOn(soundEnabled());
        sync();
        window.addEventListener('phds-sound-change', sync);
        return () => window.removeEventListener('phds-sound-change', sync);
    }, []);

    const toggle = () => {
        const next = !on;
        setSoundEnabled(next);
        if (next) {
            // Turning sound on is a click, so the browser allows a sample straight away.
            unlockSound();
            playSound('notify', { force: true });
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={on}
            aria-label={on ? 'Mute notification sounds' : 'Turn on notification sounds'}
            title={on ? 'Sound on' : 'Sound off'}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border transition hover:bg-muted"
        >
            {on ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
        </button>
    );
}
