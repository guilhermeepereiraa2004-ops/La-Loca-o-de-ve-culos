import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const sdk = { auth: {}, from() { throw new Error('Unexpected private table query'); } };
globalThis.__securityTestAuthSdk = sdk;
// Load the actual application helper, replacing only the external Supabase transport.
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './supabase' && /\/src\/lib\/(auth|mfa)\.js$/.test(context.parentURL || '')) return { url: 'security-test:supabase', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'security-test:supabase') return { format: 'module', source: 'export const supabase = globalThis.__securityTestAuthSdk; export const createPasswordVerifier=()=>({auth:{signInWithPassword:args=>supabase.auth.signInWithPassword(args),signOut:async()=>({})}});', shortCircuit: true };
    return nextLoad(url, context);
  },
});
const auth = await import('../src/lib/auth.js');
hook.deregister();
delete globalThis.__securityTestAuthSdk;
function storage(initial) {
  const values = new Map(Object.entries(initial));
  return { get length() { return values.size; }, key: index => [...values.keys()][index], getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
}

test('forged browser admin flags cannot establish identity or trigger private queries', async () => {
  let tableReads = 0;
  globalThis.window = { localStorage: storage({ la_admin_auth: 'true', la_admin_user: '{"role":"administrador"}', la_investor_auth: '{"id":"forged"}' }), sessionStorage: storage({}) };
  sdk.auth.getUser = async () => ({ data: { user: null }, error: new Error('No Auth session') });
  sdk.from = () => { tableReads++; throw new Error('Must never load personal data anonymously'); };
  assert.equal(await auth.getVerifiedProfile(),null);
  assert.equal(tableReads,0);
  auth.clearLegacySession();
  assert.equal(window.localStorage.length,0);
});
test('legacy account, log and fine caches are removed from both browser stores', () => {
  globalThis.window = { localStorage: storage({ la_admin_auth: 'true', la_system_logs: 'private-cache', la_system_fines: 'private-cache', unrelated: 'keep' }), sessionStorage: storage({ la_investor_auth: 'private-cache' }) };
  auth.clearLegacySession();
  assert.equal(window.localStorage.getItem('la_system_logs'),null);
  assert.equal(window.localStorage.getItem('la_system_fines'),null);
  assert.equal(window.sessionStorage.length,0);
  assert.equal(window.localStorage.getItem('unrelated'),'keep');
});
test('a valid Auth identity without authorized profile fails login and signs out', async () => {
  let signedOut = false;
  const reads=[];
  sdk.auth.signInWithPassword = async () => ({ error: null });
  sdk.auth.getUser = async () => ({ data: { user: { id: 'auth-test-user' } } });
  sdk.auth.signOut = async () => { signedOut=true; return {}; };
  sdk.from = table => ({ select: columns => { reads.push({ table, columns }); return { eq: () => ({ maybeSingle: async () => ({ data: null }) }) }; } });
  await assert.rejects(auth.signIn('test@example.invalid','test-password-unused','admin'),/Credenciais inválidas/);
  assert.equal(signedOut,true);
  assert.equal(reads.some(read => read.columns.split(',').some(field => field.includes('password'))),false);
});
test('an investor identity cannot enter the administrative portal', async () => {
  let signedOut = false;
  sdk.auth.signInWithPassword = async () => ({ error: null });
  sdk.auth.getUser = async () => ({ data: { user: { id: 'auth-test-investor' } } });
  sdk.auth.signOut = async () => { signedOut=true; return {}; };
  sdk.from = table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'investors' ? { id: 'investor-profile', status: 'Ativo' } : null }) }) }) });
  await assert.rejects(auth.signIn('investor@example.invalid','test-password-unused','admin'));
  assert.equal(signedOut,true);
});
test('password change cannot reach Auth update when current password is invalid', async () => {
  let updates=0;
  sdk.auth.getUser = async () => ({ data: { user: { id:'test-user',email:'test@example.invalid' } } });
  sdk.auth.signInWithPassword = async () => ({ error: {} });
  sdk.auth.updateUser = async () => { updates++; return {}; };
  const result = await auth.changeOwnPassword('incorrect-test-password','new-test-password-unique');
  assert.equal(result.success,false); assert.equal(updates,0);
});
test('password update sends current password to Auth for provider-side enforcement', async () => {
  let changes;
  sdk.auth.getUser = async () => ({ data: { user: { id:'test-user',email:'test@example.invalid' } } });
  sdk.auth.signInWithPassword = async () => ({ data:{user:{id:'test-user'}},error: null });
  sdk.auth.updateUser = async attributes => { changes=attributes; return {}; };
  const result = await auth.changeOwnPassword('current-test-password','new-test-password-unique');
  assert.equal(result.success,true);
  assert.deepEqual(changes,{ password:'new-test-password-unique',current_password:'current-test-password' });
});

test('client activation-link request reaches real handler without injecting modules', async () => {
  const { createSecurityUsersHandler } = await import('../api/security-users.js');
  const actorId='11111111-1111-4111-8111-111111111111';
  const targetId='22222222-2222-4222-8222-222222222222';
  const identityId='33333333-3333-4333-8333-333333333333';
  sdk.auth.getUser=async()=>({data:{user:{id:actorId,email:'admin@example.invalid'}}});
  sdk.auth.getSession=async()=>({data:{session:{access_token:'test-token'}}});
  const serverAuth={getUser:sdk.auth.getUser,getClaims:async()=>({data:{claims:{sub:actorId,aal:'aal1'}}}),signInWithPassword:async()=>({data:{user:{id:actorId}}}),signOut:async()=>({})};
  const admin={
    rpc:async()=>({data:true}),
    auth:{admin:{
      getUserById:async()=>({data:{user:{id:identityId,email:'target@example.invalid',email_confirmed_at:'2026-10-23'}}}),
      generateLink:async()=>({data:{user:{id:identityId},properties:{hashed_token:'private-test-token',action_link:'https://auth.example.invalid/verify?token=private-test-token&type=recovery'}}}),
    }},
    from(table){
      let field,value;
      const chain={select(){return chain;},eq(f,v){field=f;value=v;return chain;},async maybeSingle(){
        if(field==='auth_user_id')return {data:table==='system_users'&&value===actorId?{id:actorId,auth_user_id:actorId,role:'administrador'}:null};
        return {data:{id:targetId,auth_user_id:identityId,email:'target@example.invalid',role:'funcionario',modules:['frota']}};
      }};return chain;
    },
  };
  const handler=createSecurityUsersHandler({environment:{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'server',AUTH_REDIRECT_URL:'https://app.example.invalid/auth/callback'},clientFactory:(_url,key)=>key==='server'?admin:{auth:serverAuth}});
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    assert.deepEqual(body.profile,{id:targetId});
    const response={code:200,setHeader(){},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
    await handler({method:'POST',headers:{host:'app.example.invalid',origin:'https://app.example.invalid','content-type':'application/json',authorization:options.headers.Authorization},body},response);
    return {ok:response.code===200,json:async()=>response.body};
  };
  try{
    const result=await auth.manageAccount('system','activation-link',{id:targetId},'current-test-password');
    assert.match(result.activationLink,/private-test-token/);
  }finally{globalThis.fetch=previousFetch;}
});
