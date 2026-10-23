import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicInterestHandler, validateInterest } from '../api/public-interest.js';
const vehicleId = '11111111-1111-4111-8111-111111111111';
const body = () => ({ name: 'Test Contact', contact: '(79) 99999-9999', email: 'contact@example.invalid', type: 'locacao', vehicleId, message: 'Gostaria de mais informações.', website: '' });
function fixture(options = {}) {
  const calls = [];
  const clientKeys = [];
  let saved;
  const environment = { VERCEL: '1', SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'private-test-key', SUPABASE_ANON_KEY: 'public-test-key', ...options.environment };
  const database = {
    rpc: async (name, params) => {
      calls.push({ name, params });
      if (name === 'get_public_fleet') return { data: [{ id: vehicleId, model: 'Test model', plate: 'private-plate' }] };
      return options.rateError ? { error: {} } : { data: !options.throttled };
    },
    from: table => ({ insert: async payload => { calls.push({ name: 'insert', table }); saved = payload; return options.insertError ? { error: { message: 'private-database-detail' } } : {}; } }),
  };
  const handler = createPublicInterestHandler({ environment, clientFactory: (_url, key) => {
    clientKeys.push(key);
    return { ...database, rpc: (name, params) => name === 'get_public_fleet' && key !== 'public-test-key' ? { error: { code: '42501' } } : database.rpc(name, params) };
  }, fetchImpl: options.fetchImpl ?? (async () => ({ ok: true, json: async () => ({ success: true, hostname: 'test.invalid', action: 'public_interest' }) })) });
  const request = (overrides = {}) => ({ method: 'POST', headers: { host: 'test.invalid', origin: 'https://test.invalid', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1' }, body: body(), socket: { remoteAddress: '127.0.0.1' }, ...overrides });
  const response = () => ({ code: 200, headers: {}, setHeader(key,value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(payload) { this.body = payload; return this; } });
  return { handler, request, response, calls, clientKeys, get saved() { return saved; } };
}
test('accepts valid anonymous contact without exposing stored PII, IDs or plate', async () => {
  const f = fixture(); const res = f.response();
  await f.handler(f.request(), res);
  assert.equal(res.code, 201); assert.deepEqual(res.body, { success: true });
  assert.equal(f.saved.vehicle_model, 'Test model'); assert.equal('plate' in f.saved, false);
  assert.equal(f.saved.status, 'Novo'); assert.equal(f.saved.contact, '79999999999');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(f.calls[0].params.p_limit, 3); assert.equal(f.calls[0].params.p_window_seconds, 300);
  assert.equal(f.calls[0].params.p_key.includes('192.0.2.1'), false);
});

test('catalogue lookup uses the public key and fails closed when it is missing', async () => {
  const f = fixture(), response = f.response();
  await f.handler(f.request(), response);
  assert.equal(response.code, 201);
  assert.deepEqual(f.clientKeys, ['private-test-key', 'public-test-key']);
  const missing = fixture({ environment: { SUPABASE_ANON_KEY: undefined } }), failure = missing.response();
  await missing.handler(missing.request(), failure);
  assert.equal(failure.code, 503); assert.equal(missing.saved, undefined);
});
test('rate limiter and database failures fail closed with no fake success', async () => {
  for (const [options, code] of [[{ rateError: true }, 503], [{ throttled: true }, 429], [{ insertError: true }, 503]]) {
    const f = fixture(options); const res = f.response(); await f.handler(f.request(), res);
    assert.equal(res.code, code); assert.equal(res.body.success, undefined);
    assert.equal(JSON.stringify(res.body).includes('private-database-detail'), false);
  }
});
test('strict schema rejects privileged fields, honeypot spam, invalid phone, long text and URL spam', () => {
  for (const mutation of [p => { p.status = 'Aprovado'; }, p => { p.vehiclePlate = 'private-plate'; }, p => { p.website = 'spam'; }, p => { p.contact = 'abc'; }, p => { p.name = 'x'.repeat(161); }, p => { p.message = 'https://a.test https://b.test https://c.test'; }]) {
    const input = body(); mutation(input); assert.throws(() => validateInterest(input));
  }
});
test('origin, JSON, method and body size enforced before database', async () => {
  const cases = [
    [{ method: 'GET' },405],
    [{ headers: { origin: 'https://evil.invalid', host: 'test.invalid' } },403],
    [{ headers: { host: 'test.invalid', origin: 'https://test.invalid', 'content-type': 'text/plain' } },415],
    [{ body: 'x'.repeat(8300) },413],
  ];
  for (const [overrides, code] of cases) {
    const f = fixture(); const res = f.response(); await f.handler(f.request(overrides),res);
    assert.equal(res.code,code); assert.equal(f.calls.length,0);
  }
});
test('ignores arbitrary forwarded IPs outside Vercel and denies missing trusted IP', async () => {
  const f = fixture({ environment: { VERCEL: undefined } }); const a = f.response();
  await f.handler(f.request(), a); assert.equal(a.code,201);
  const key = f.calls[0].params.p_key;
  const g = fixture({ environment: { VERCEL: undefined } }); const b = g.response();
  const request = g.request(); request.headers['x-vercel-forwarded-for'] = '192.0.2.99';
  await g.handler(request,b); assert.equal(g.calls[0].params.p_key,key);
  const h = fixture(); const c = h.response(); const missing = h.request(); delete missing.headers['x-vercel-forwarded-for'];
  await h.handler(missing,c); assert.equal(c.code,503); assert.equal(h.calls.length,0);
});
test('configured Turnstile requires valid action/hostname and paired keys', async () => {
  const environment = { TURNSTILE_SECRET_KEY: 'captcha-secret', VITE_TURNSTILE_SITE_KEY: 'public-sitekey' };
  const f = fixture({ environment }); const a = f.response(); await f.handler(f.request(),a); assert.equal(a.code,400);
  const valid = f.request(); valid.body.captchaToken = 'response-token'; const b = f.response(); await f.handler(valid,b); assert.equal(b.code,201);
  const g = fixture({ environment, fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, hostname: 'evil.invalid', action: 'public_interest' }) }) });
  const c = g.response(); await g.handler(valid,c); assert.equal(c.code,400);
  const h = fixture({ environment: { TURNSTILE_SECRET_KEY: 'captcha-secret' } }); const d = h.response(); await h.handler(h.request(),d); assert.equal(d.code,503);
});
