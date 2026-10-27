import type { Identity } from '@/lib/e2ee';

/**
 * Where an unlocked identity lives in this browser. A CryptoKey stored in
 * IndexedDB is not extractable: scripts can use it but cannot read the key out.
 * It is removed when you log out, unless you chose to stay unlocked on this device.
 */
const DB_NAME = 'phds-chat';
const STORE = 'identities';

type Stored = { publicKey: string; privateKey: CryptoKey; keep: boolean };

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
        const request = work(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }).finally(() => db.close());
}

export async function saveIdentity(userId: string, identity: Identity, keep: boolean): Promise<void> {
    const value: Stored = { publicKey: identity.publicKey, privateKey: identity.privateKey, keep };
    await run('readwrite', (store) => store.put(value, userId));
}

export async function loadIdentity(userId: string): Promise<{ identity: Identity; keep: boolean } | null> {
    try {
        const stored = await run<Stored | undefined>('readonly', (store) => store.get(userId));
        return stored ? { identity: { publicKey: stored.publicKey, privateKey: stored.privateKey }, keep: stored.keep } : null;
    } catch {
        return null;
    }
}

export async function clearIdentity(userId: string): Promise<void> {
    try {
        await run('readwrite', (store) => store.delete(userId));
    } catch {
        // nothing stored, nothing to clear
    }
}

/** Called when logging out. Keeps the key only if the person asked to. */
export async function clearUnlessKept(userId: string): Promise<void> {
    const stored = await loadIdentity(userId);
    if (stored && !stored.keep) await clearIdentity(userId);
}

// Security codes already seen, per signed-in person, so a changed key can be flagged.
const fingerprintKey = (me: string) => `phds-chat-codes:${me}`;

export function knownFingerprints(me: string): Record<string, string> {
    try {
        return JSON.parse(localStorage.getItem(fingerprintKey(me)) ?? '{}') as Record<string, string>;
    } catch {
        return {};
    }
}

export function rememberFingerprint(me: string, userId: string, code: string): void {
    try {
        localStorage.setItem(fingerprintKey(me), JSON.stringify({ ...knownFingerprints(me), [userId]: code }));
    } catch {
        // private mode: the warning just comes back next time
    }
}
