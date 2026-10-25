/**
 * Notification sounds, made in the browser with the Web Audio API. There is no
 * audio file to download or host: a short chime is built from two sine tones.
 *
 * Browsers only allow sound after the person has clicked or pressed a key on the
 * page at least once, so unlockSound() is called on the first gesture. After that
 * sounds play freely, even while the tab is in the background.
 */
const STORAGE_KEY = 'phds-chat-sound';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let lastPlayed = 0;

export type SoundKind = 'message' | 'notify';

export function soundEnabled(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function setSoundEnabled(on: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
        // private mode: the choice lasts until the page reloads
    }
    window.dispatchEvent(new Event('phds-sound-change'));
}

function audioContext(): AudioContext | null {
    if (context) return context;

    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;

    context = new Ctor();
    return context;
}

/** Call from a click or key press. Safe to call many times. */
export function unlockSound(): void {
    const ctx = audioContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tone(ctx: AudioContext, frequency: number, start: number, length: number, volume: number): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // A quick fade in and a smooth fade out, so it chimes instead of clicking.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.05);
}

/**
 * "message" is a soft pop for a new message in the chat you are looking at.
 * "notify" is a two-note chime for anything that needs your attention.
 * Sounds closer than a second apart are merged so a burst makes one sound.
 */
export function playSound(kind: SoundKind, options: { force?: boolean } = {}): void {
    if (!options.force && !soundEnabled()) return;

    const ctx = audioContext();
    if (!ctx) return;

    if (ctx.state !== 'running') {
        // Not unlocked yet. Try to wake it, and stay silent this time.
        void ctx.resume();
        return;
    }

    const now = Date.now();
    if (!options.force && now - lastPlayed < 1000) return;
    lastPlayed = now;

    const start = ctx.currentTime;

    if (kind === 'notify') {
        tone(ctx, 880, start, 0.2, 0.18);
        tone(ctx, 1318.5, start + 0.15, 0.32, 0.18);
    } else {
        tone(ctx, 660, start, 0.14, 0.12);
    }
}
