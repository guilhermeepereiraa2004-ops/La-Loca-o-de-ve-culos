import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import { getDraft, saveDraft, clearDraft, openDb, sanitizeInspectionDraft } from '../src/utils/indexedDbHelper.js';
globalThis.indexedDB = fakeIndexedDB;
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';

async function rawPut(key, data) {
  const db = await openDb();
  await new Promise((resolve, reject) => { const tx = db.transaction('drafts', 'readwrite'); tx.objectStore('drafts').put(data, key); tx.oncomplete = resolve; tx.onabort = reject; });
  db.close();
}
async function rawGet(key) {
  const db = await openDb();
  const value = await new Promise((resolve, reject) => { const tx = db.transaction('drafts', 'readonly'); const req = tx.objectStore('drafts').get(key); req.onsuccess = () => resolve(req.result); req.onerror = reject; });
  db.close(); return value;
}

test('draft saves/restores per owner and never loads or removes another owner or legacy draft', async () => {
  await rawPut('current_inspection_draft', { vehiclePlate: 'LEGACY-ONLY', photos: {} });
  await saveDraft({ vehiclePlate: 'OWNER-A', observations: 'Draft A', photos: { front: { preview: 'storage://La-locacao/vistorias/a.png' } } }, ownerA);
  await saveDraft({ vehiclePlate: 'OWNER-B', observations: 'Draft B' }, ownerB);
  assert.equal((await getDraft(ownerA)).vehiclePlate, 'OWNER-A'); assert.equal((await getDraft(ownerB)).vehiclePlate, 'OWNER-B');
  assert.equal(await getDraft(), null); assert.equal(await saveDraft({ observations: 'visitor' }), false);
  await clearDraft(ownerA);
  assert.equal(await getDraft(ownerA), null); assert.equal((await getDraft(ownerB)).vehiclePlate, 'OWNER-B');
  assert.equal((await rawGet('current_inspection_draft')).vehiclePlate, 'LEGACY-ONLY');
});

test('draft serialization removes bearer tokens, binary files, dangerous schemes and arbitrary fields', () => {
  const project = 'https://project.example.invalid';
  const output = sanitizeInspectionDraft({
    password: 'never-store', observations: 'Expected text',
    photos: { valid: { preview: project + '/storage/v1/object/sign/La-locacao/vistorias/a.png?token=PRIVATE-BEARER', file: new Blob(['binary']) }, dangerous: { preview: 'javascript:alert(1)' }, blob: { preview: 'blob:private-object' }, data: { preview: 'data:image/png;base64,AAAA' } },
    deductions: [{ category: 'Lavagem', value: '10', unexpected: 'secret' }],
  }, project);
  assert.deepEqual(output.photos, { valid: { preview: 'storage://La-locacao/vistorias/a.png' } });
  const serialized = JSON.stringify(output);
  for (const forbidden of ['PRIVATE-BEARER','never-store','binary','javascript:','blob:','base64','unexpected']) assert.equal(serialized.includes(forbidden), false);
  assert.equal(output.observations, 'Expected text');
});

test('a forged envelope for a different owner is rejected without deleting it', async () => {
  await rawPut('inspection:v2:' + ownerA, { schema: 2, ownerId: ownerB, data: { observations: 'different owner' } });
  assert.equal(await getDraft(ownerA), null);
  assert.equal((await rawGet('inspection:v2:' + ownerA)).ownerId, ownerB);
});
