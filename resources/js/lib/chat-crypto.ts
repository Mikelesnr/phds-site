import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    createIdentity,
    decryptEnvelope,
    fingerprint,
    newConversationKey,
    openKey,
    sealKey,
    unlockIdentity,
    type Envelope,
    type Identity,
} from '@/lib/e2ee';
import {
    clearIdentity,
    knownFingerprints,
    loadIdentity,
    rememberFingerprint,
    saveIdentity,
} from '@/lib/key-store';
import type { ChatConversation, ChatMessage, CryptoBlock } from '@/types';

export type IdentityStatus = 'loading' | 'setup' | 'locked' | 'ready' | 'error';
export type Plain = { ok: true; env: Envelope } | { ok: false };

/** Is there an identity on the server, and is it unlocked in this browser? */
export function useChatIdentity(userId: string) {
    const [status, setStatus] = useState<IdentityStatus>('loading');
    const [identity, setIdentity] = useState<Identity | null>(null);
    const remote = useRef<{ publicKey: string; encrypted: string } | null>(null);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const { data } = await axios.get<{
                    exists: boolean;
                    public_key: string | null;
                    encrypted_private_key: string | null;
                }>('/chat-keys/me');

                if (!data.exists || !data.public_key || !data.encrypted_private_key) {
                    await clearIdentity(userId);
                    if (alive) setStatus('setup');
                    return;
                }

                remote.current = { publicKey: data.public_key, encrypted: data.encrypted_private_key };
                const local = await loadIdentity(userId);

                if (local && local.identity.publicKey === data.public_key) {
                    if (alive) {
                        setIdentity(local.identity);
                        setStatus('ready');
                    }
                } else if (alive) {
                    setStatus('locked');
                }
            } catch {
                if (alive) setStatus('error');
            }
        })();

        return () => {
            alive = false;
        };
    }, [userId]);

    const adopt = useCallback(
        async (next: Identity, publicKey: string, encrypted: string, keep: boolean) => {
            await saveIdentity(userId, next, keep);
            remote.current = { publicKey, encrypted };
            setIdentity(next);
            setStatus('ready');
        },
        [userId],
    );

    /** First time: make the identity and lock it with the passphrase. */
    const setup = useCallback(
        async (passphrase: string, keep: boolean) => {
            const made = await createIdentity(passphrase);
            await axios.post('/chat-keys', { public_key: made.publicKey, encrypted_private_key: made.encryptedPrivateKey });
            await adopt(made.identity, made.publicKey, made.encryptedPrivateKey, keep);
        },
        [adopt],
    );

    /** New device or cleared browser: the passphrase opens the backed-up key. Throws if wrong. */
    const unlock = useCallback(
        async (passphrase: string, keep: boolean) => {
            if (!remote.current) return;
            const opened = await unlockIdentity(remote.current.encrypted, remote.current.publicKey, passphrase);
            await adopt(opened, remote.current.publicKey, remote.current.encrypted, keep);
        },
        [adopt],
    );

    /** Forgot the passphrase: start again. Old messages stay unreadable until members share keys anew. */
    const reset = useCallback(
        async (passphrase: string, keep: boolean) => {
            const made = await createIdentity(passphrase);
            await axios.post('/chat-keys/reset', { public_key: made.publicKey, encrypted_private_key: made.encryptedPrivateKey });
            await adopt(made.identity, made.publicKey, made.encryptedPrivateKey, keep);
        },
        [adopt],
    );

    return { status, identity, setup, unlock, reset };
}

/** Open every sealed key the server holds for me. Keys that will not open are skipped. */
export async function openAll(
    sealed: CryptoBlock['my_keys'],
    identity: Identity,
    cache?: Map<string, CryptoKey>,
): Promise<Map<number, CryptoKey>> {
    const keys = new Map<number, CryptoKey>();

    for (const { version, wrapped_key } of sealed) {
        try {
            let key = cache?.get(wrapped_key);
            if (!key) {
                key = await openKey(wrapped_key, identity);
                cache?.set(wrapped_key, key);
            }
            keys.set(version, key);
        } catch {
            // sealed for an older identity of mine, nothing to be done
        }
    }

    return keys;
}

type KeyArgs = {
    conversation: ChatConversation | null;
    identity: Identity | null;
    meId: string;
    /** Called after keys were shared, so the page can fetch the new state. */
    onShared: () => void;
};

/**
 * Everything about one conversation's keys:
 *  - opens the keys sealed for me,
 *  - if nobody has a key for the current version and I am allowed to start it
 *    (either person in a direct chat, the moderator of a group), makes one and seals
 *    it for every member who has set up encryption,
 *  - if I hold keys and a member is missing them, seals mine for them (direct chats
 *    and open groups: anyone; private groups: the moderator).
 */
export function useConversationKeys({ conversation, identity, meId, onShared }: KeyArgs) {
    const [keys, setKeys] = useState<Map<number, CryptoKey>>(new Map());
    const [opening, setOpening] = useState(true);
    const opened = useRef(new Map<string, CryptoKey>());
    const attempted = useRef(new Set<string>());
    const conversationId = conversation?.id ?? null;
    // The content, not just the length: a re-shared key is the same size as the one it replaces.
    const signature = conversation?.crypto.my_keys.map((k) => `${k.version}:${k.wrapped_key}`).join('|') ?? '';

    useEffect(() => {
        let alive = true;
        setKeys(new Map());
        setOpening(true);

        if (conversation && identity) {
            void openAll(conversation.crypto.my_keys, identity, opened.current).then((map) => {
                if (alive) {
                    setKeys(map);
                    setOpening(false);
                }
            });
        } else {
            setOpening(false);
        }

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, signature, identity]);

    useEffect(() => {
        if (!conversation || !identity) return;

        const { crypto: block, members } = conversation;
        const direct = conversation.type === 'direct';
        const mayStart = direct || conversation.is_moderator;
        const mayShare = direct || conversation.visibility === 'open' || conversation.is_moderator;

        const run = async () => {
            if (!block.provisioned) {
                if (!mayStart) return;
                const tag = `start:${conversation.id}:${block.key_version}`;
                if (attempted.current.has(tag)) return;
                attempted.current.add(tag);

                const key = await newConversationKey();
                const entries = [];
                for (const member of members) {
                    if (!member.public_key) continue; // not set up yet, they get it later
                    entries.push({
                        user_id: member.id,
                        version: block.key_version,
                        wrapped_key: await sealKey(key, member.public_key),
                    });
                }

                await axios.post(`/team-chat/${conversation.id}/keys`, { keys: entries }).catch(() => undefined);
                onShared();
                return;
            }

            if (keys.size === 0 || !mayShare) return;

            const missing = members.filter((m) => !m.has_key && m.public_key && m.id !== meId);
            if (missing.length === 0) return;

            const tag = `share:${conversation.id}:${missing.map((m) => m.id + (m.public_key ?? '').slice(-8)).join(',')}:${keys.size}`;
            if (attempted.current.has(tag)) return;
            attempted.current.add(tag);

            const entries = [];
            for (const member of missing) {
                for (const [version, key] of keys) {
                    entries.push({ user_id: member.id, version, wrapped_key: await sealKey(key, member.public_key!) });
                }
            }

            await axios.post(`/team-chat/${conversation.id}/keys`, { keys: entries }).catch(() => undefined);
            onShared();
        };

        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation, identity, keys, meId]);

    const latestVersion = keys.size > 0 ? Math.max(...keys.keys()) : null;

    return { keys, latestVersion, opening, canWrite: latestVersion !== null };
}

/** Decrypts messages as they arrive and remembers the result. */
export function useDecryptedMessages(messages: ChatMessage[], keys: Map<number, CryptoKey>) {
    const cache = useRef(new Map<string, Plain>());
    const [, setTick] = useState(0);

    useEffect(() => {
        let alive = true;

        (async () => {
            let changed = false;

            for (const message of messages) {
                if (message.deleted || !message.ciphertext || !message.iv) continue;

                const id = `${message.id}:${message.iv}`;
                const key = keys.get(message.key_version);
                if (cache.current.has(id) || !key) continue;

                try {
                    const env = await decryptEnvelope(key, message.ciphertext, message.iv, {
                        conversationId: message.conversation_id,
                        messageId: message.id,
                        senderId: message.sender_id,
                        version: message.key_version,
                    });
                    cache.current.set(id, { ok: true, env });
                } catch {
                    cache.current.set(id, { ok: false });
                }
                changed = true;
            }

            if (changed && alive) setTick((n) => n + 1);
        })();

        return () => {
            alive = false;
        };
    }, [messages, keys]);

    return useCallback(
        (message: ChatMessage): Plain | null =>
            cache.current.get(`${message.id}:${message.iv}`) ?? null,
        [],
    );
}

/** Security codes for the people in a conversation, and which ones changed since last seen. */
export function useSecurityCodes(conversation: ChatConversation | null, meId: string) {
    const [codes, setCodes] = useState<Record<string, string>>({});
    const [changed, setChanged] = useState<string[]>([]);
    const members = conversation?.members ?? [];
    const signature = members.map((m) => `${m.id}:${m.public_key?.slice(-10)}`).join(',');

    useEffect(() => {
        let alive = true;

        (async () => {
            const next: Record<string, string> = {};
            const flagged: string[] = [];
            const known = knownFingerprints(meId);

            for (const member of members) {
                if (!member.public_key) continue;
                const code = await fingerprint(member.public_key);
                next[member.id] = code;

                if (!known[member.id]) rememberFingerprint(meId, member.id, code);
                else if (known[member.id] !== code && member.id !== meId) flagged.push(member.id);
            }

            if (alive) {
                setCodes(next);
                setChanged(flagged);
            }
        })();

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, meId]);

    const accept = useCallback(
        (userId: string) => {
            if (codes[userId]) rememberFingerprint(meId, userId, codes[userId]);
            setChanged((current) => current.filter((id) => id !== userId));
        },
        [codes, meId],
    );

    return { codes, changed, accept };
}
