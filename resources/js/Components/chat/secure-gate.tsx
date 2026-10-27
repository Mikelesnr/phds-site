import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { WrongPassphraseError } from '@/lib/e2ee';
import type { IdentityStatus } from '@/lib/chat-crypto';

const field =
    'w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus:border-highlight focus:ring-1 focus:ring-highlight';

type Props = {
    status: Exclude<IdentityStatus, 'ready'>;
    onSetup: (passphrase: string, keep: boolean) => Promise<void>;
    onUnlock: (passphrase: string, keep: boolean) => Promise<void>;
    onReset: (passphrase: string, keep: boolean) => Promise<void>;
};

const MIN_LENGTH = 10;

/** Shown instead of the conversation until this browser holds the person's chat key. */
export function SecureGate({ status, onSetup, onUnlock, onReset }: Props) {
    const [passphrase, setPassphrase] = useState('');
    const [confirm, setConfirm] = useState('');
    const [keep, setKeep] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgot, setForgot] = useState(false);

    if (status === 'loading') {
        return <Centered><p className="text-muted-foreground">Preparing secure chat...</p></Centered>;
    }

    if (status === 'error') {
        return (
            <Centered>
                <p role="alert" className="font-medium text-red-600 dark:text-red-400">
                    Your chat keys could not be loaded. Please refresh the page.
                </p>
            </Centered>
        );
    }

    const creating = status === 'setup' || forgot;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);

        if (creating) {
            if (passphrase.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
            if (passphrase !== confirm) return setError('The two passphrases do not match.');
        } else if (passphrase === '') {
            return setError('Enter your chat passphrase.');
        }

        setBusy(true);
        try {
            if (status === 'setup') await onSetup(passphrase, keep);
            else if (forgot) await onReset(passphrase, keep);
            else await onUnlock(passphrase, keep);
        } catch (caught) {
            setError(
                caught instanceof WrongPassphraseError
                    ? 'That passphrase is not right. Try again.'
                    : 'Something went wrong. Please try again.',
            );
            setBusy(false);
        }
    };

    return (
        <Centered>
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent/20 text-highlight">
                {creating ? <ShieldCheck className="size-7" aria-hidden="true" /> : <KeyRound className="size-7" aria-hidden="true" />}
            </span>
            <h2 className="text-3xl font-medium">
                {status === 'setup' ? 'Set up secure chat' : forgot ? 'Start again with a new passphrase' : 'Unlock secure chat'}
            </h2>

            {status === 'setup' && (
                <p className="max-w-md text-muted-foreground">
                    Your messages are end-to-end encrypted: only the people in a conversation can read them, not the
                    server. Choose a chat passphrase to protect your key. It is not your login password.
                </p>
            )}
            {status === 'locked' && !forgot && (
                <p className="max-w-md text-muted-foreground">
                    Enter your chat passphrase to read your messages on this device.
                </p>
            )}
            {forgot && (
                <p role="note" className="max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">
                    Nobody can recover your old passphrase. Starting again gives you a new key. Messages you could
                    read before stay locked until other people in those conversations share their keys with you.
                </p>
            )}

            <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-4 text-left">
                <div>
                    <label htmlFor="passphrase" className="mb-1.5 block text-sm font-bold">
                        {creating ? 'New chat passphrase' : 'Chat passphrase'}
                    </label>
                    <input
                        id="passphrase"
                        type="password"
                        value={passphrase}
                        onChange={(event) => setPassphrase(event.target.value)}
                        autoComplete={creating ? 'new-password' : 'current-password'}
                        className={field}
                        autoFocus
                    />
                </div>

                {creating && (
                    <div>
                        <label htmlFor="passphrase-confirm" className="mb-1.5 block text-sm font-bold">
                            Confirm passphrase
                        </label>
                        <input
                            id="passphrase-confirm"
                            type="password"
                            value={confirm}
                            onChange={(event) => setConfirm(event.target.value)}
                            autoComplete="new-password"
                            className={field}
                        />
                        {status === 'setup' && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Write it down somewhere safe. If you forget it, nobody can recover it for you.
                            </p>
                        )}
                    </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} className="mt-0.5" />
                    <span>Stay unlocked on this device after I log out. Only tick this on your own computer.</span>
                </label>

                {error && (
                    <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-50"
                >
                    <Lock className="size-4" aria-hidden="true" />
                    {busy ? 'Working...' : status === 'setup' ? 'Create my secure chat' : forgot ? 'Create new key' : 'Unlock'}
                </button>

                {status === 'locked' && (
                    <button
                        type="button"
                        onClick={() => {
                            setForgot((value) => !value);
                            setError(null);
                            setPassphrase('');
                            setConfirm('');
                        }}
                        className="w-full text-center text-sm font-bold text-highlight hover:underline"
                    >
                        {forgot ? 'I remembered it, go back' : 'I forgot my passphrase'}
                    </button>
                )}
            </form>
        </Centered>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8 text-center">
            {children}
        </div>
    );
}
