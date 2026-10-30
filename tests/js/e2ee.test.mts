import assert from 'node:assert/strict';
import * as e from '../../resources/js/lib/e2ee.ts';

let passed = 0;
const ok = async (name: string, fn: () => Promise<void>) => { await fn(); passed++; console.log('PASS', name); };
const rejects = async (fn: () => Promise<unknown>) => { try { await fn(); } catch { return true; } return false; };

const alice = await e.createIdentity('correct horse battery');
const bob = await e.createIdentity('another passphrase');
const carol = await e.createIdentity('third passphrase');
const ctx = { conversationId: 'c1', messageId: 'm1', senderId: 'alice', version: 1 };

await ok('the locked private key is not readable and holds no passphrase', async () => {
  const blob = JSON.parse(alice.encryptedPrivateKey);
  assert.equal(blob.kdf, 'PBKDF2-SHA256'); assert.equal(blob.iterations, 600000);
  assert.ok(!alice.encryptedPrivateKey.includes('correct horse'));
});
await ok('the right passphrase unlocks the identity (a new device)', async () => {
  const id = await e.unlockIdentity(alice.encryptedPrivateKey, alice.publicKey, 'correct horse battery');
  assert.equal(id.publicKey, alice.publicKey);
  // and it can open a key sealed for alice
  const k = await e.newConversationKey(); const sealed = await e.sealKey(k, alice.publicKey);
  const opened = await e.openKey(sealed, id);
  const m = await e.encryptEnvelope(k, { v: 1, text: 'hi' }, ctx);
  assert.equal((await e.decryptEnvelope(opened, m.ciphertext, m.iv, ctx)).text, 'hi');
});
await ok('a wrong passphrase is refused', async () => {
  await assert.rejects(e.unlockIdentity(alice.encryptedPrivateKey, alice.publicKey, 'wrong'), e.WrongPassphraseError);
});
await ok('the private key cannot be exported once imported', async () => {
  await assert.rejects(crypto.subtle.exportKey('pkcs8', alice.identity.privateKey));
});
await ok('a key sealed for bob opens for bob and only bob', async () => {
  const k = await e.newConversationKey(); const sealed = await e.sealKey(k, bob.publicKey);
  const opened = await e.openKey(sealed, bob.identity);
  const m = await e.encryptEnvelope(k, { v: 1, text: 'secret' }, ctx);
  assert.equal((await e.decryptEnvelope(opened, m.ciphertext, m.iv, ctx)).text, 'secret');
  assert.ok(await rejects(() => e.openKey(sealed, alice.identity)), 'alice must not open bob\'s copy');
  assert.ok(await rejects(() => e.openKey(sealed, carol.identity)), 'carol must not open it either');
});
await ok('every seal is different, even for the same key and person', async () => {
  const k = await e.newConversationKey();
  assert.notEqual(await e.sealKey(k, bob.publicKey), await e.sealKey(k, bob.publicKey));
});
await ok('ciphertext does not contain the text and IVs are never reused', async () => {
  const k = await e.newConversationKey();
  const a = await e.encryptEnvelope(k, { v: 1, text: 'meet at the landing site' }, ctx);
  const b = await e.encryptEnvelope(k, { v: 1, text: 'meet at the landing site' }, ctx);
  assert.ok(!atob(a.ciphertext).includes('landing')); assert.notEqual(a.iv, b.iv); assert.notEqual(a.ciphertext, b.ciphertext);
});
await ok('a message cannot be moved, replayed or re-attributed', async () => {
  const k = await e.newConversationKey(); const m = await e.encryptEnvelope(k, { v: 1, text: 'x' }, ctx);
  for (const bad of [{ ...ctx, conversationId: 'c2' }, { ...ctx, messageId: 'm2' }, { ...ctx, senderId: 'bob' }, { ...ctx, version: 2 }])
    assert.ok(await rejects(() => e.decryptEnvelope(k, m.ciphertext, m.iv, bad)), JSON.stringify(bad));
});
await ok('tampering with the ciphertext or the IV is detected', async () => {
  const k = await e.newConversationKey(); const m = await e.encryptEnvelope(k, { v: 1, text: 'x' }, ctx);
  const flip = (s: string) => { const b = e.fromBase64(s); b[0] ^= 1; return e.toBase64(b); };
  assert.ok(await rejects(() => e.decryptEnvelope(k, flip(m.ciphertext), m.iv, ctx)));
  assert.ok(await rejects(() => e.decryptEnvelope(k, m.ciphertext, flip(m.iv), ctx)));
});
await ok('a different conversation key cannot read it', async () => {
  const k1 = await e.newConversationKey(); const k2 = await e.newConversationKey(); const m = await e.encryptEnvelope(k1, { v: 1, text: 'x' }, ctx);
  assert.ok(await rejects(() => e.decryptEnvelope(k2, m.ciphertext, m.iv, ctx)));
});
await ok('replies and forwards travel inside the encrypted envelope', async () => {
  const k = await e.newConversationKey();
  const env = { v: 1 as const, text: 'agreed', reply: { id: 'm0' }, forwarded: { author: 'Kevin', at: '2026-10-25T10:00:00Z' } };
  const m = await e.encryptEnvelope(k, env, ctx);
  assert.ok(!atob(m.ciphertext).includes('Kevin')); assert.ok(!atob(m.ciphertext).includes('m0'));
  assert.deepEqual(await e.decryptEnvelope(k, m.ciphertext, m.iv, ctx), env);
});
await ok('fingerprints are stable, readable and differ per key', async () => {
  const f1 = await e.fingerprint(alice.publicKey); assert.equal(f1, await e.fingerprint(alice.publicKey));
  assert.match(f1, /^([0-9A-F]{4} ){7}[0-9A-F]{4}$/); assert.notEqual(f1, await e.fingerprint(bob.publicKey));
});
await ok('rotation: an old member cannot read the new key version', async () => {
  const v1 = await e.newConversationKey(); const v2 = await e.newConversationKey();
  const bobV1 = await e.openKey(await e.sealKey(v1, bob.publicKey), bob.identity);
  const aliceV2 = await e.openKey(await e.sealKey(v2, alice.publicKey), alice.identity);
  const msg = await e.encryptEnvelope(v2, { v: 1, text: 'after bob left' }, { ...ctx, version: 2 });
  assert.equal((await e.decryptEnvelope(aliceV2, msg.ciphertext, msg.iv, { ...ctx, version: 2 })).text, 'after bob left');
  assert.ok(await rejects(() => e.decryptEnvelope(bobV1, msg.ciphertext, msg.iv, { ...ctx, version: 2 })));
});
console.log(`\n${passed} crypto checks passed`);
