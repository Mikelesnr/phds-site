import axios from 'axios';
import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export type FormConfig = {
    ready: boolean;
    min: number;
    max: number;
    quick: number[];
};

type Status = {
    id: string;
    status: 'pending' | 'awaiting_payment' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
    terminal: boolean;
    message: string;
    amount: number;
    campaign: string | null;
    receipt: string | null;
    phone: string;
};

type Stage = 'form' | 'waiting' | 'done';

const STORAGE = 'phds-donation-attempt';
const field =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-highlight focus:ring-1 focus:ring-highlight';

/**
 * One donation attempt is one id. It is made here, saved here, and sent with every
 * retry, so a repeated press, a reload or a dropped connection finds the same
 * donation on the server. It is only replaced once that donation has finished,
 * or the donor changes any detail.
 */
type Attempt = { id: string; amount: number; phone: string; campaignId: string | null };

function loadAttempt(): Attempt | null {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE) ?? 'null') as Attempt | null;
    } catch {
        return null;
    }
}

function saveAttempt(attempt: Attempt | null): void {
    try {
        if (attempt) sessionStorage.setItem(STORAGE, JSON.stringify(attempt));
        else sessionStorage.removeItem(STORAGE);
    } catch {
        // private mode: a reload would start a new attempt, which the server still guards by phone
    }
}

function sameDetails(a: Attempt, b: Attempt): boolean {
    return a.amount === b.amount && a.phone === b.phone && a.campaignId === b.campaignId;
}

function normalisePhone(raw: string): string {
    const digits = raw.replace(/[\s\-().+]/g, '');
    if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
    if (/^254[17]\d{8}$/.test(digits)) return digits;
    if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
    return raw;
}

export function DonationForm({
    config,
    campaignId,
    campaignTitle,
    onDone,
}: {
    config: FormConfig;
    campaignId: string | null;
    campaignTitle: string | null;
    onDone?: () => void;
}) {
    const [stage, setStage] = useState<Stage>('form');
    const [amount, setAmount] = useState<string>('');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<Status | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const timer = useRef<number | null>(null);

    // Pick up an attempt that was still in flight before a reload.
    useEffect(() => {
        const saved = loadAttempt();
        if (saved && (saved.campaignId ?? null) === (campaignId ?? null)) {
            setAmount(String(saved.amount));
            setPhone(saved.phone);
            setActiveId(saved.id);
            setStage('waiting');
        }
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [campaignId]);

    // While the donor is entering their PIN, check the status every few seconds.
    useEffect(() => {
        if (!activeId || stage !== 'waiting') return;
        let alive = true;

        const poll = async () => {
            try {
                const { data } = await axios.get<Status>(routes.donateStatus(activeId));
                if (!alive) return;
                setStatus(data);

                if (data.terminal) {
                    saveAttempt(null);
                    setStage('done');
                    setActiveId(null);
                    onDone?.();
                    return;
                }
            } catch {
                // a dropped poll just means we check again
            }
            if (alive) timer.current = window.setTimeout(poll, 3000);
        };

        void poll();
        return () => {
            alive = false;
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [activeId, stage, onDone]);

    const amountNumber = Number(amount);
    const phoneNormalised = normalisePhone(phone);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setError(null);

        if (!Number.isInteger(amountNumber) || amountNumber < config.min || amountNumber > config.max) {
            setError(`Choose an amount between KES ${config.min.toLocaleString()} and KES ${config.max.toLocaleString()}.`);
            return;
        }
        if (!/^254[17]\d{8}$/.test(phoneNormalised)) {
            setError('Enter a Safaricom number such as 0712 345 678.');
            return;
        }

        const details: Attempt = { id: '', amount: amountNumber, phone: phoneNormalised, campaignId };
        const previous = loadAttempt();

        // Same details as an attempt still in flight: reuse its id, never start a second payment.
        const attempt: Attempt =
            previous && sameDetails(previous, details) ? previous : { ...details, id: crypto.randomUUID() };
        saveAttempt(attempt);

        setBusy(true);
        try {
            const { data } = await axios.post<Status>(routes.donate, {
                id: attempt.id,
                amount: attempt.amount,
                phone: attempt.phone,
                campaign_id: attempt.campaignId,
                donor_name: name.trim() || null,
            });

            setStatus(data);
            setActiveId(attempt.id);
            if (data.terminal) {
                saveAttempt(null);
                setStage('done');
                onDone?.();
            } else {
                setStage('waiting');
            }
        } catch (caught) {
            if (axios.isAxiosError(caught) && caught.response) {
                const body = caught.response.data as { message?: string; existing_id?: string };
                // Someone is already waiting on this number: follow that donation instead.
                if (caught.response.status === 409 && body.existing_id) {
                    saveAttempt({ ...attempt, id: body.existing_id });
                    setActiveId(body.existing_id);
                    setStage('waiting');
                    return;
                }
                setError(body.message ?? 'We could not start the payment. Please check the details and try again.');
                // A validation or limit answer means nothing was started, so this attempt can be dropped.
                if (caught.response.status < 500) saveAttempt(null);
            } else {
                // No answer at all: keep the same attempt so pressing Donate again cannot double-charge.
                setError('We lost the connection before we heard back. Press Donate again to continue this donation. You will not be charged twice.');
            }
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        saveAttempt(null);
        setActiveId(null);
        setStatus(null);
        setStage('form');
        setError(null);
    };

    if (!config.ready) {
        return (
            <div className="rounded-2xl border border-border bg-muted p-6 text-center text-muted-foreground">
                Online donations are being set up. Please check back soon, or contact us to give another way.
            </div>
        );
    }

    if (stage === 'waiting' || stage === 'done') {
        const finished: Status | null = stage === 'done' && status ? status : null;
        const ok = finished?.status === 'succeeded';

        return (
            <div data-testid="donation-status" className="rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
                {!finished && (
                    <div className="text-center">
                        <Smartphone className="mx-auto size-12 text-highlight" aria-hidden="true" />
                        <h3 className="mt-4 text-2xl font-medium">Check your phone</h3>
                        <p className="mt-2 text-muted-foreground">
                            {status?.message ?? 'An M-Pesa prompt is on its way. Enter your PIN to complete the donation.'}
                        </p>
                        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Waiting for your approval
                        </p>
                    </div>
                )}

                {finished && (
                    <div className="text-center">
                        {ok ? (
                            <CheckCircle2 className="mx-auto size-12 text-highlight" aria-hidden="true" />
                        ) : (
                            <XCircle className="mx-auto size-12 text-red-600 dark:text-red-400" aria-hidden="true" />
                        )}
                        <h3 className="mt-4 text-2xl font-medium">{ok ? 'Thank you' : 'Donation not completed'}</h3>
                        <p className="mt-2 text-muted-foreground">{finished.message}</p>
                        {ok && finished.receipt && (
                            <p className="mt-3 text-sm">
                                M-Pesa receipt: <strong data-testid="receipt">{finished.receipt}</strong>
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={reset}
                            className="mt-6 rounded-lg bg-accent px-5 py-2.5 font-bold text-accent-foreground"
                        >
                            {ok ? 'Make another donation' : 'Try again'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-6 rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
            <div>
                <p className="mb-2 text-sm font-bold">Amount (KES)</p>
                <div className="flex flex-wrap gap-2">
                    {config.quick.map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setAmount(String(value))}
                            aria-pressed={amount === String(value)}
                            className={cn(
                                'rounded-full border px-4 py-2 text-sm font-bold transition',
                                amount === String(value) ? 'border-highlight bg-accent/20 text-highlight' : 'border-border hover:bg-muted',
                            )}
                        >
                            {value.toLocaleString()}
                        </button>
                    ))}
                </div>
                <label htmlFor="donate-amount" className="sr-only">
                    Other amount
                </label>
                <input
                    id="donate-amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Or type another amount"
                    className={cn(field, 'mt-3')}
                />
            </div>

            <div>
                <label htmlFor="donate-phone" className="mb-1.5 block text-sm font-bold">
                    M-Pesa phone number
                </label>
                <input
                    id="donate-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0712 345 678"
                    className={field}
                />
                <p className="mt-1 text-sm text-muted-foreground">You will get a prompt on this phone to approve.</p>
            </div>

            <div>
                <label htmlFor="donate-name" className="mb-1.5 block text-sm font-bold">
                    Name <span className="font-normal text-muted-foreground">(optional, shown on our records)</span>
                </label>
                <input id="donate-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className={field} />
            </div>

            {campaignTitle && (
                <p className="rounded-xl bg-muted px-4 py-3 text-sm">
                    Your gift goes to <strong>{campaignTitle}</strong>.
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-4 text-lg font-bold text-accent-foreground disabled:opacity-60"
            >
                {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                {busy ? 'Sending to your phone...' : `Donate${amountNumber ? ` KES ${amountNumber.toLocaleString()}` : ''}`}
            </button>
        </form>
    );
}
