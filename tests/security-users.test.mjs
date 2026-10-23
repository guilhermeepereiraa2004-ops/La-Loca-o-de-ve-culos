import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecurityUsersHandler, validateAccountInput } from '../api/security-users.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const identityId = '33333333-3333-4333-8333-333333333333';
const createInput = () => ({ kind: 'system', action: 'create', currentPassword: 'current-test-password', profile: { name: 'Test User', email: 'test@example.invalid', password: 'new-test-password-unique', role: 'funcionario', modules: ['frota'] } });
function fixture(options = {}) {
  const calls = [];
  const auth = {
    getUser: async () => { calls.push('getUser'); return options.unauthenticated ? { data: { user: null }, error: {} } : { data: { user: { id: actorId, email: 'admin@example.invalid' } } }; },
    signInWithPassword: async () => { calls.push('reauth'); return options.badPassword ? { data: null, error: {} } : { data: { user: { id: actorId } } }; },
    signOut: async () => { calls.push('signOut'); return {}; },
  };
  const admin = {
    rpc: async () => { calls.push('rate-limit'); return options.rateFailure ? { data: null, error: {} } : { data: !options.throttled }; },
    auth: { admin: {
      createUser: async () => { calls.push('create-auth'); return { data: { user: { id: identityId } } }; },
      updateUserById: async () => { calls.push('update-auth'); return {}; },
      deleteUser: async () => { calls.push('delete-auth'); return {}; },
    } },
    from(table) {
      let operation = 'select';
      let payload;
      let by;
      const chain = {
        select() { return chain; },
        eq(column, value) { by = [column, value]; return chain; },
        insert(value) { operation = 'insert'; payload = value; return chain; },
        update(value) { operation = 'update'; payload = value; return chain; },
        delete() { operation = 'delete'; return chain; },
        maybeSingle: async () => {
          if (by?.[0] === 'auth_user_id' && (table === 'investors' || by[1] !== actorId)) { calls.push('identity-conflict-check'); return { data: options.duplicateIdentity || (options.duplicateTarget && by[1] === identityId) ? { id: targetId } : null }; }
          if (by?.[0] === 'auth_user_id') { calls.push('actor-role'); return { data: { id: actorId, auth_user_id: actorId, role: options.nonAdmin ? 'funcionario' : 'administrador' } }; }
          calls.push('target');
          return { data: { id: targetId, auth_user_id: options.self ? actorId : identityId, name: 'Target', email: 'target@example.invalid', role: 'funcionario', modules: ['frota'] } };
        },
        single: async () => {
          calls.push('save-profile');
          assert.equal('password' in payload, false, 'password must never reach a public profile');
          return { data: { id: targetId, ...payload } };
        },
        then(resolve) { calls.push(operation + '-profile'); resolve({ error: null }); },
      };
      return chain;
    },
  };
  const handler = createSecurityUsersHandler({ environment: { SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'public-test', SUPABASE_SERVICE_ROLE_KEY: 'server-test' }, clientFactory: (_url, key) => key === 'server-test' ? admin : { auth } });
  const request = (body = createInput(), overrides = {}) => ({ method: 'POST', headers: { host: 'test.invalid', origin: 'https://test.invalid', 'content-type': 'application/json', authorization: 'Bearer test-token' }, body, ...overrides });
  const response = () => ({ code: 200, headers: {}, setHeader(key,value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  return { handler, request, response, calls };
}

test('rejects arbitrary fields, role escalation payloads, weak passwords and invalid modules', () => {
  for (const mutation of [p => { p.auth_user_id = identityId; }, p => { p.isAdmin = true; }, p => { p.password = 'short'; }, p => { p.modules = ['unknown']; }]) {
    const input = createInput(); mutation(input.profile);
    assert.throws(() => validateAccountInput(input));
  }
});
test('denies anonymous request before privileged profile lookup', async () => {
  const f = fixture({ unauthenticated: true }); const res = f.response();
  await f.handler(f.request(), res);
  assert.equal(res.code, 401); assert.deepEqual(f.calls, ['getUser']);
});
test('denies authenticated non-admin regardless of body role', async () => {
  const f = fixture({ nonAdmin: true }); const res = f.response();
  const input = createInput(); input.profile.role = 'administrador';
  await f.handler(f.request(input), res);
  assert.equal(res.code, 403); assert.equal(f.calls.includes('create-auth'), false);
});
test('requires fresh server-side password check', async () => {
  const f = fixture({ badPassword: true }); const res = f.response();
  await f.handler(f.request(), res);
  assert.equal(res.code, 403); assert.equal(f.calls.includes('create-auth'), false);
});
test('distributed rate limit fails closed and prevents brute-force', async () => {
  for (const [options, code] of [[{ throttled: true }, 429], [{ rateFailure: true }, 503]]) {
    const f = fixture(options); const res = f.response(); await f.handler(f.request(), res);
    assert.equal(res.code, code); assert.equal(f.calls.includes('reauth'), false);
  }
});
test('successful creation stores passwords only in Auth and never returns them', async () => {
  const f = fixture(); const res = f.response(); const input = createInput();
  await f.handler(f.request(input), res);
  assert.equal(res.code, 200); assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.ok(f.calls.indexOf('getUser') < f.calls.indexOf('actor-role'));
  assert.ok(f.calls.indexOf('reauth') < f.calls.indexOf('create-auth'));
  assert.equal(JSON.stringify(res.body).includes(input.profile.password), false);
  assert.equal(JSON.stringify(res.body).includes(input.currentPassword), false);
  assert.equal(JSON.stringify(res.body).includes('server-test'), false);
});
test('deletion removes authorization before deleting Auth identity', async () => {
  const f = fixture(); const res = f.response();
  await f.handler(f.request({ kind: 'system', action: 'delete', currentPassword: 'current-test-password', profile: { id: targetId } }), res);
  assert.equal(res.code, 200); assert.ok(f.calls.indexOf('delete-profile') < f.calls.indexOf('delete-auth'));
});
test('administrator cannot delete or demote their own identity', async () => {
  const f = fixture({ self: true }); const res = f.response();
  await f.handler(f.request({ kind: 'system', action: 'delete', currentPassword: 'current-test-password', profile: { id: targetId } }), res);
  assert.equal(res.code, 409); assert.equal(f.calls.includes('delete-auth'), false);
});
test('rejects cross-origin, non-JSON, oversized bodies, and unsupported methods', async () => {
  const variants = [
    [{ method: 'GET' }, 405],
    [{ headers: { 'sec-fetch-site': 'cross-site' } }, 403],
    [{ headers: { origin: 'https://evil.invalid', host: 'test.invalid' } }, 403],
    [{ headers: { 'content-type': 'text/plain' } }, 415],
    [{ body: 'x'.repeat(17000) }, 413],
  ];
  for (const [overrides, code] of variants) {
    const f = fixture(); const res = f.response(); await f.handler(f.request(createInput(), overrides), res);
    assert.equal(res.code, code); assert.equal(f.calls.length, 0);
  }
});

test('fails closed on a shared staff/investor identity before modifying accounts', async () => {
  const f = fixture({ duplicateIdentity: true }); const res = f.response();
  await f.handler(f.request(), res);
  assert.equal(res.code, 409); assert.equal(f.calls.includes('reauth'), false); assert.equal(f.calls.includes('create-auth'), false);
});

test('refuses changes to target linked in both account tables before Auth mutation', async () => {
  const f=fixture({ duplicateTarget:true }); const res=f.response();
  const input=createInput(); input.action='update'; input.profile.id=targetId;
  await f.handler(f.request(input),res);
  assert.equal(res.code,409); assert.equal(f.calls.includes('update-auth'),false); assert.equal(f.calls.includes('save-profile'),false);
});
