/**
 * End-to-end encryption for team chat, built only on the browser's own WebCrypto.
 *
 *  - Each person has an identity: an ECDH P-256 key pair made in their browser.
 *    The public half goes to the server. The private half is locked with a chat
 *    passphrase (PBKDF2 + AES-GCM) before it is backed up, so the server holds a
 *    blob it cannot open.
 *  - Each conversation has one AES-256-GCM key. It is "sealed" separately for each
 *    member with their public key (ephemeral ECDH + HKDF + AES-GCM), so only that
 *    member can open their copy.
 *  - Every message is encrypted with the conversation key under a fresh random IV,
 *    and bound to its conversation, id, sender and key version so that a
 *    ciphertext cannot be moved or replayed somewhere else.
 *
 * Nothing in this file talks to the network or the page, which keeps it testable.
 */

export type Envelope = {
    v: 1;
    text: string;
    reply?: { id: string };
    forwarded?: { author: string; at: string };
};

export type Identity = { publicKey: string; privateKey: CryptoKey };

export type MessageContext = {
    conversationId: string;
    messageId: string;
    senderId: string;
    version: number;
};

export class WrongPassphraseError extends Error {
    constructor() {
        super('That chat passphrase is not right.');
        this.name = 'WrongPassphraseError';
    }
}

const PBKDF2_ITERATIONS = 600_000;
const WRAP_INFO = 'phds-chat-wrap-v1';
const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    for (const byte of view) binary += String.fromCharCode(byte);
    return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(length));
}

// ------------------------------------------------------------------ identity

async function passphraseKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);

    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function importPrivate(pkcs8: ArrayBuffer): Promise<CryptoKey> {
    // Not extractable: once imported, the key cannot be read back out of the browser.
    return crypto.subtle.importKey('pkcs8', pkcs8, CURVE, false, ['deriveBits']);
}

/** Make a new identity and lock its private half with the passphrase. */
export async function createIdentity(passphrase: string): Promise<{
    identity: Identity;
    publicKey: string;
    encryptedPrivateKey: string;
}> {
    const pair = await crypto.subtle.generateKey(CURVE, true, ['deriveBits']);
    const publicKey = toBase64(await crypto.subtle.exportKey('raw', pair.publicKey));
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);

    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await passphraseKey(passphrase, salt, PBKDF2_ITERATIONS);
    const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pkcs8);

    return {
        identity: { publicKey, privateKey: await importPrivate(pkcs8) },
        publicKey,
        encryptedPrivateKey: JSON.stringify({
            v: 1,
            kdf: 'PBKDF2-SHA256',
            iterations: PBKDF2_ITERATIONS,
            salt: toBase64(salt),
            iv: toBase64(iv),
            ct: toBase64(sealed),
        }),
    };
}

/** Open a stored identity with the passphrase. Throws WrongPassphraseError if it does not fit. */
export async function unlockIdentity(
    encryptedPrivateKey: string,
    publicKey: string,
    passphrase: string,
): Promise<Identity> {
    const blob = JSON.parse(encryptedPrivateKey) as {
        iterations: number;
        salt: string;
        iv: string;
        ct: string;
    };

    try {
        const key = await passphraseKey(passphrase, fromBase64(blob.salt), blob.iterations);
        const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(blob.iv) }, key, fromBase64(blob.ct));

        return { publicKey, privateKey: await importPrivate(pkcs8) };
    } catch {
        throw new WrongPassphraseError();
    }
}

/** A short code two people can read to each other to check they hold the same key. */
export async function fingerprint(publicKey: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', fromBase64(publicKey));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');

    return hex
        .slice(0, 32)
        .toUpperCase()
        .replace(/(.{4})(?=.)/g, '$1 ');
}

// ------------------------------------------------------------------ conversation keys

export async function newConversationKey(): Promise<CryptoKey> {
    // Extractable on purpose: a member who holds it must be able to seal it for others.
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function wrapKey(secret: ArrayBuffer, ephemeralPublic: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);

    return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: ephemeralPublic, info: encoder.encode(WRAP_INFO) },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** Seal a conversation key so only the owner of `recipientPublicKey` can open it. */
export async function sealKey(conversationKey: CryptoKey, recipientPublicKey: string): Promise<string> {
    const ephemeral = await crypto.subtle.generateKey(CURVE, true, ['deriveBits']);
    const recipient = await crypto.subtle.importKey('raw', fromBase64(recipientPublicKey), CURVE, false, []);
    const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipient }, ephemeral.privateKey, 256);

    const ephemeralPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
    const wrap = await wrapKey(secret, ephemeralPublic);
    const iv = randomBytes(12);
    const raw = await crypto.subtle.exportKey('raw', conversationKey);
    const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrap, raw);

    return JSON.stringify({ v: 1, epk: toBase64(ephemeralPublic), iv: toBase64(iv), ct: toBase64(sealed) });
}

/** Open a sealed conversation key with my identity. */
export async function openKey(sealed: string, identity: Identity): Promise<CryptoKey> {
    const { epk, iv, ct } = JSON.parse(sealed) as { epk: string; iv: string; ct: string };
    const ephemeralPublic = fromBase64(epk);
    const sender = await crypto.subtle.importKey('raw', ephemeralPublic, CURVE, false, []);
    const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: sender }, identity.privateKey, 256);
    const wrap = await wrapKey(secret, ephemeralPublic);
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, wrap, fromBase64(ct));

    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}

// ------------------------------------------------------------------ messages

function additionalData(context: MessageContext): Uint8Array<ArrayBuffer> {
    return encoder.encode(`${context.conversationId}|${context.messageId}|${context.senderId}|${context.version}`);
}

export async function encryptEnvelope(
    key: CryptoKey,
    envelope: Envelope,
    context: MessageContext,
): Promise<{ ciphertext: string; iv: string }> {
    const iv = randomBytes(12);
    const sealed = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: additionalData(context) },
        key,
        encoder.encode(JSON.stringify(envelope)),
    );

    return { ciphertext: toBase64(sealed), iv: toBase64(iv) };
}

export async function decryptEnvelope(
    key: CryptoKey,
    ciphertext: string,
    iv: string,
    context: MessageContext,
): Promise<Envelope> {
    const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv), additionalData: additionalData(context) },
        key,
        fromBase64(ciphertext),
    );

    return JSON.parse(decoder.decode(plain)) as Envelope;
}
