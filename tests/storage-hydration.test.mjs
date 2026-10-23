import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const transport = {};
globalThis.__storageHydrationTestSdk = transport;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes('/src/utils/storageSecurity.js') && specifier === '../lib/supabase.js') return { url: 'storage-hydration-test:sdk', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'storage-hydration-test:sdk') return { format: 'module', source: 'export const supabase=globalThis.__storageHydrationTestSdk;', shortCircuit: true };
    return next(url, context);
  },
});
const { createStorageUrlResolver, uploadFile, clearStorageUrlCache } = await import('../src/utils/storageSecurity.js');
hooks.deregister(); delete globalThis.__storageHydrationTestSdk;

const projectUrl = 'https://project.example.invalid';
const reference = path => 'storage://La-locacao/' + path;
const oldUrl = path => projectUrl + '/storage/v1/object/public/La-locacao/' + path;
const signedUrl = path => projectUrl + '/storage/v1/object/sign/La-locacao/' + path + '?token=test-only';
const response = paths => ({ data: paths.map(path => ({ path, signedUrl: signedUrl(path), error: null })), error: null });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function fixture(implementation = async paths => response(paths)) {
  const calls = []; let active = 0, maximum = 0;
  const client = { storage: { from(bucket) {
    return {
      getPublicUrl: path => ({ data: { publicUrl: projectUrl + '/storage/v1/object/public/' + bucket + '/' + path } }),
      async createSignedUrls(paths, seconds) {
        calls.push({ bucket, paths: [...paths], seconds }); active++; maximum = Math.max(maximum, active);
        try { return await implementation(paths); } finally { active--; }
      },
    };
  } } };
  return { client, calls, maximum: () => maximum, resolver: createStorageUrlResolver({ client, projectUrl }) };
}

test('450 attachments use five batches of at most100 and global concurrency at most3', async () => {
  const f = fixture(async paths => { await delay(2); return response(paths); });
  const input = Array.from({ length: 450 }, (_, index) => ({ id: index, photos: [{ preview: oldUrl('vistorias/' + index + '.png') }] }));
  const output = await f.resolver.hydrate(input);
  assert.equal(f.calls.length, 5); assert.ok(f.maximum() <= 3);
  assert.ok(f.calls.every(call => call.bucket === 'La-locacao' && call.paths.length <= 100 && call.seconds === 1800));
  assert.equal(output.length, input.length); assert.equal(output[0].id, input[0].id);
  assert.equal(output[449].photos[0].preview, signedUrl('vistorias/449.png'));
  assert.equal(input[0].photos[0].preview, oldUrl('vistorias/0.png'));
});

test('overlapping tables share in-flight signatures and cached paths across URL formats', async () => {
  const f = fixture(async paths => { await delay(3); return response(paths); });
  const paths = Array.from({ length: 220 }, (_, index) => 'vistorias/' + index + '.png');
  const [first, second] = await Promise.all([f.resolver.hydrate(paths.map(oldUrl)), f.resolver.hydrate(paths.map(reference))]);
  assert.equal(f.calls.flatMap(call => call.paths).length, paths.length);
  assert.deepEqual(first, second);
  await f.resolver.hydrate(paths.map(reference));
  assert.equal(f.calls.flatMap(call => call.paths).length, paths.length);
});

test('network rejection, missing file and denied signature preserve stable references on save round-trip', async () => {
  const f = fixture(async paths => ({ data: paths.map(path => path.includes('denied') ? { path, error: 'denied', signedUrl: null } : { path, signedUrl: signedUrl(path), error: null }), error: null }));
  const output = await f.resolver.hydrate({ denied: oldUrl('vistorias/denied.png'), valid: oldUrl('vistorias/valid.png') });
  assert.equal(output.denied, reference('vistorias/denied.png'));
  assert.equal(output.valid, signedUrl('vistorias/valid.png'));
  assert.equal(JSON.parse(JSON.stringify(output)).denied, reference('vistorias/denied.png'));
  assert.equal(f.resolver.getPublicUrl(output.denied), null);
  const failed = fixture(async () => { throw new Error('connection failed'); });
  assert.deepEqual(await failed.resolver.hydrate({ attachment: oldUrl('contratos/a.pdf') }), { attachment: reference('contratos/a.pdf') });
});

test('hung service cannot block metadata indefinitely or start queued requests after deadline', async () => {
  const late = [];
  const f = fixture(paths => new Promise(resolve => late.push(() => resolve(response(paths)))));
  const paths = Array.from({ length: 1200 }, (_, index) => reference('vistorias/' + index + '.png'));
  const start = Date.now();
  const [first, second] = await Promise.all([
    f.resolver.hydrate(paths, { timeoutMs: 12, totalTimeoutMs: 30 }),
    f.resolver.hydrate([reference('contratos/later.pdf')], { timeoutMs: 12, totalTimeoutMs: 30 }),
  ]);
  assert.ok(Date.now() - start < 1000);
  assert.deepEqual(first, paths); assert.deepEqual(second, [reference('contratos/later.pdf')]);
  assert.equal(f.calls.length, 3); assert.ok(f.maximum() <= 3);
  late.forEach(finish => finish()); await delay(8);
  assert.equal(f.calls.length, 3);
  assert.equal(f.resolver.getPublicUrl(paths[0]), null);
});

test('logout clears pending work/cache and late signatures never repopulate another session', async () => {
  let finish;
  const f = fixture(paths => new Promise(resolve => { finish = () => resolve(response(paths)); }));
  const pending = f.resolver.hydrate({ document: reference('contratos/a.pdf') });
  await delay(1); f.resolver.clearCache();
  const result = await pending;
  assert.equal(result.document, reference('contratos/a.pdf'));
  finish(); await delay(2);
  assert.equal(f.resolver.getPublicUrl(result.document), null);
});

test('public marketing images need no signing and unsafe schemes stay blocked', async () => {
  const f = fixture();
  const image = 'storage://vehicle-public-images/veiculos/photo.png';
  assert.equal(await f.resolver.hydrate(image), projectUrl + '/storage/v1/object/public/vehicle-public-images/veiculos/photo.png');
  assert.equal(f.calls.length, 0);
  assert.equal(f.resolver.getPublicUrl('javascript:alert(1)'), null);
  assert.equal(f.resolver.getPublicUrl('data:text/html,<script>payload</script>'), null);
});

test('successful private upload retains its path when preview signature fails', async () => {
  clearStorageUrlCache();
  transport.auth = { getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null }) };
  transport.functions = { invoke: async () => ({ data: { bucket: 'La-locacao', path: 'vistorias/new.png' }, error: null }) };
  transport.storage = fixture(async () => { throw new Error('signature unavailable'); }).client.storage;
  const bytes = Uint8Array.from([137,80,78,71,13,10,26,10]);
  const file = { size: bytes.length, type: 'image/png', name: 'new.png', arrayBuffer: async () => bytes.buffer };
  assert.equal(await uploadFile(file, 'vistorias'), reference('vistorias/new.png'));
  clearStorageUrlCache();
});
