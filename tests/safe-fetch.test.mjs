import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { createSafeFetch } from '../lib/server/safeFetch.js';

const URL_BASE = 'https://ucfzkzpmvjekgotexriq.supabase.co';
function fixture({ status = 200, headers = { 'content-type': 'application/json' }, payload = Buffer.from('{"mensagem":"Ação válida"}'), hang = false, complete = true } = {}) {
  const calls = [], streams = [];
  const request = (url, options, callback) => {
    const outgoing = new EventEmitter(); outgoing.destroyed = false;
    outgoing.destroy = () => { outgoing.destroyed = true; };
    outgoing.end = body => {
      calls.push({ url: url.href, options, body, outgoing });
      if (hang) return;
      queueMicrotask(() => {
        const incoming = new EventEmitter(); incoming.headers = headers; incoming.statusCode = status; incoming.complete = complete; incoming.destroyed = false;
        incoming.destroy = () => { incoming.destroyed = true; };
        streams.push(incoming); callback(incoming);
        if (!incoming.destroyed) { incoming.emit('data', payload); incoming.emit('end'); }
      });
    };
    return outgoing;
  };
  return { fetch: createSafeFetch({ request, timeoutMs: 100 }), calls, streams, request };
}

test('HTTPS JSON roundtrip preserves Unicode/body/auth and forces identity with no connection pool', async () => {
  const f = fixture();
  const request = new Request(URL_BASE + '/rest/v1/test', { method: 'POST', headers: { authorization: 'Bearer fixture-not-a-secret', 'content-type': 'application/json', 'accept-encoding': 'br', connection: 'keep-alive', host: 'attacker.invalid' }, body: '{"nome":"Locação"}' });
  const response = await f.fetch(request);
  assert.deepEqual(await response.json(), { mensagem: 'Ação válida' });
  assert.equal(f.calls[0].body.toString(), '{"nome":"Locação"}');
  assert.equal(f.calls[0].options.agent, false);
  assert.equal(f.calls[0].options.headers['accept-encoding'], 'identity');
  assert.equal(f.calls[0].options.headers.connection, 'close');
  assert.equal(f.calls[0].options.headers.host, undefined);
  assert.equal(f.calls[0].options.headers.authorization, 'Bearer fixture-not-a-secret');
});

test('204 response stays bodyless and response headers cannot forward cookies or transport metadata', async () => {
  const f = fixture({ status: 204, payload: Buffer.alloc(0), headers: { 'set-cookie': 'secret=fixture', connection: 'keep-alive', 'content-range': '0-1/2' } });
  const response = await f.fetch(URL_BASE + '/rest/v1/test', { method: 'DELETE' });
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.equal(response.headers.get('set-cookie'), null); assert.equal(response.headers.get('connection'), null);
  assert.equal(response.headers.get('content-range'), '0-1/2');
});

test('real benign Brotli/gzip bytes are rejected from headers before any data listener or decoder', async () => {
  const plaintext = Buffer.from('Documento sintético sem dados pessoais.');
  for (const [encoding, payload] of [['br', brotliCompressSync(plaintext)], ['gzip', gzipSync(plaintext)], ['br, identity', Buffer.alloc(0)]]) {
    const f = fixture({ headers: { 'content-encoding': encoding }, payload });
    await assert.rejects(f.fetch(URL_BASE + '/rest/v1/test'), error => error.code === 'COMPRESSED_RESPONSE');
    assert.equal(f.streams[0].listenerCount('data'), 0);
    assert.equal(f.streams[0].destroyed, true); assert.equal(f.calls[0].outgoing.destroyed, true);
  }
});

test('redirect is returned and never followed, even to an unapproved origin', async () => {
  const f = fixture({ status: 302, headers: { location: 'https://attacker.invalid/capture' }, payload: Buffer.alloc(0) });
  const response = await f.fetch(URL_BASE + '/rest/v1/test');
  assert.equal(response.status, 302); assert.equal(f.calls.length, 1);
  assert.equal(response.headers.get('location'), 'https://attacker.invalid/capture');
});

test('URL boundary rejects non-HTTPS, credentials, explicit/default ports, Unicode and unapproved hosts before transport', async () => {
  const f = fixture();
  for (const url of [URL_BASE.replace('https:', 'http:'), URL_BASE.replace('https://', 'https://a:b@'), URL_BASE + ':443/test', URL_BASE + ':8443/test', URL_BASE + '/ação', 'https://attacker.invalid/', URL_BASE + '.attacker.invalid/', URL_BASE + '/test#fragment']) {
    await assert.rejects(f.fetch(url), error => error.code === 'UNSAFE_URL');
  }
  assert.equal(f.calls.length, 0);
});

test('total timeout and external abort destroy the request; pre-aborted calls never start transport', async () => {
  const timeout = fixture({ hang: true });
  await assert.rejects(createSafeFetch({ request: timeout.request, timeoutMs: 10 })(URL_BASE + '/rest/v1/test'), error => error.code === 'ABORTED');
  assert.equal(timeout.calls[0].outgoing.destroyed, true);
  const f = fixture({ hang: true }), controller = new AbortController();
  const pending = f.fetch(URL_BASE + '/rest/v1/test', { signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve)); controller.abort();
  await assert.rejects(pending, error => error.code === 'ABORTED');
  assert.equal(f.calls[0].outgoing.destroyed, true);
  const before = fixture(); await assert.rejects(before.fetch(URL_BASE, { signal: controller.signal }), error => error.code === 'ABORTED');
  assert.equal(before.calls.length, 0);
});

test('declared and streamed response excess, request excess and incomplete responses fail closed', async () => {
  for (const options of [{ headers: { 'content-length': '999' } }, { payload: Buffer.alloc(33) }, { complete: false, payload: Buffer.from('{}') }]) {
    const f = fixture(options);
    await assert.rejects(createSafeFetch({ request: f.request, maxResponseBytes: 32 })(URL_BASE + '/rest/v1/test'));
    assert.equal(f.streams[0].destroyed, true);
  }
  const f = fixture();
  await assert.rejects(createSafeFetch({ request: f.request, maxResponseBytes: 32 })(URL_BASE, { method: 'POST', body: 'x'.repeat(33) }), error => error.code === 'REQUEST_TOO_LARGE');
  assert.equal(f.calls.length, 0);
});

test('deadline also cancels an unfinished Request body before opening any socket', async () => {
  const f = fixture(); let cancelled = false;
  const body = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { cancelled = true; } });
  const request = new Request(URL_BASE + '/rest/v1/test', { method: 'POST', body, duplex: 'half' });
  await assert.rejects(createSafeFetch({ request: f.request, timeoutMs: 10 })(request), error => error.code === 'ABORTED');
  assert.equal(cancelled, true); assert.equal(f.calls.length, 0);
});
