import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const transport={auth:{}};
globalThis.__recoveryTestSdk=transport;
const hooks=registerHooks({
  resolve(specifier,context,next){
    if(context.parentURL?.endsWith('/src/lib/passwordRecovery.js')) {
      if(specifier==='./supabase') return {url:'recovery-test:sdk',shortCircuit:true};
      if(specifier==='./auth') return {url:'recovery-test:auth',shortCircuit:true};
    }
    return next(specifier,context);
  },
  load(url,context,next){
    if(url==='recovery-test:sdk') return {format:'module',source:'export const supabase=globalThis.__recoveryTestSdk;',shortCircuit:true};
    if(url==='recovery-test:auth') return {format:'module',source:'export async function getVerifiedProfile(){throw new Error("Use injected fixture");}',shortCircuit:true};
    return next(url,context);
  },
});
const {createPasswordRecoveryController,parsePasswordLink,requestPasswordRecovery}=await import('../src/lib/passwordRecovery.js');
hooks.deregister();delete globalThis.__recoveryTestSdk;
const origin='https://example.invalid';
const invite=origin+'/auth/callback?token_hash=test-only-hash&type=invite';
const implicit=origin+'/auth/callback#access_token=test-only-access&refresh_token=test-only-refresh&type=recovery';
function fixture(options={}){
  let now=Date.UTC(2026,9,23,15);const calls=[];let profileActive=true;let sessionId='test-session';let mfaRequired=Boolean(options.mfaRequired);
  const session={access_token:'test-access'};
  const result=async method=>{calls.push(method);return options.invalidToken?{error:{message:'private-provider-error'}}:{data:{session}};};
  const client={auth:{
    verifyOtp:()=>result('verifyOtp'),setSession:()=>result('setSession'),exchangeCodeForSession:()=>result('exchangeCodeForSession'),
    getUser:async()=>{calls.push('getUser');return options.noUser?{data:{user:null},error:{}}:{data:{user:{id:'test-user',email_confirmed_at:'2026-10-23T15:00:00Z'}}};},
    getClaims:async()=>{calls.push('getClaims');return {data:{claims:{sub:options.wrongSubject?'other-user':'test-user',session_id:sessionId,iat:Math.floor(now/1000),amr:[{method:options.method||'invite',timestamp:Math.floor(now/1000)}]}}};},
    getSession:async()=>({data:{session}}),
    updateUser:async attributes=>{calls.push('updateUser');assert.deepEqual(Object.keys(attributes),['password']);return options.updateError?{error:{}}:{};},
    signOut:async({scope})=>{calls.push('signOut:'+scope);return {};},
  }};
  const controller=createPasswordRecoveryController({client,getProfile:async()=>{calls.push('profile');return profileActive?{authUserId:'test-user',role:'administrador',mfaRequired}:null;},clock:()=>now});
  return {controller,calls,advance:ms=>{now+=ms;},revokeProfile:()=>{profileActive=false;},switchSession:()=>{sessionId='changed-session';},confirmMfa:()=>{mfaRequired=false;}};
}
test('valid one-time invite is checked remotely and URL is stripped before network requests',async()=>{
  const f=fixture();await f.controller.begin(invite,()=>f.calls.push('clearUrl'));
  assert.equal(f.calls[0],'clearUrl');assert.deepEqual(f.calls.slice(1),['verifyOtp','getUser','getClaims','profile']);
  await f.controller.finish('new-test-password-unique','new-test-password-unique');
  assert.ok(f.calls.includes('updateUser'));assert.equal(f.calls.at(-1),'signOut:global');
  await assert.rejects(f.controller.finish('other-test-password-unique','other-test-password-unique'));
});
test('React strict re-mount cannot redeem the same single-use token twice',async()=>{
  const f=fixture();const first=f.controller.begin(invite);const second=f.controller.begin(origin+'/auth/callback');
  await Promise.all([first,second]);assert.equal(f.calls.filter(x=>x==='verifyOtp').length,1);
});
test('implicit recovery session and PKCE callback use validated Auth methods',async()=>{
  const a=fixture({method:'recovery'});await a.controller.begin(implicit);assert.ok(a.calls.includes('setSession'));
  const b=fixture({method:'recovery'});await b.controller.begin(origin+'/auth/callback?code=test-code');assert.ok(b.calls.includes('exchangeCodeForSession'));
});
test('forged recovery label on password session cannot authorize password definition',async()=>{
  const f=fixture({method:'password'});await assert.rejects(f.controller.begin(implicit),/inválido ou expirou/);
  assert.equal(f.calls.includes('profile'),false);assert.equal(f.calls.includes('updateUser'),false);
});
test('invalid token or mismatching validated identity cannot authorize access',async()=>{
  for(const options of [{invalidToken:true},{noUser:true},{wrongSubject:true}]){
    const f=fixture(options);await assert.rejects(f.controller.begin(invite),error=>!error.message.includes('private-provider-error'));
    assert.equal(f.calls.includes('updateUser'),false);
  }
});
test('session switch, profile revocation and expired grants prevent password mutation',async()=>{
  for(const invalidate of [f=>f.switchSession(),f=>f.revokeProfile(),f=>f.advance(16*60*1000)]){
    const f=fixture();await f.controller.begin(invite);invalidate(f);
    await assert.rejects(f.controller.finish('new-test-password-unique','new-test-password-unique'));
    assert.equal(f.calls.includes('updateUser'),false);
  }
});
test('weak/mismatched passwords do not reach provider update',async()=>{
  const f=fixture();await f.controller.begin(invite);
  await assert.rejects(f.controller.finish('short','short'));
  await assert.rejects(f.controller.finish('new-test-password-unique','different-test-password'));
  assert.equal(f.calls.includes('updateUser'),false);
});
test('callback rejects mixed mechanisms, arbitrary types and unrecognized callback paths',()=>{
  for(const href of [origin+'/?token_hash=x&type=invite',origin+'/auth/callback?token_hash=x&type=magiclink',invite+'#access_token=x&refresh_token=y&type=invite',origin+'/auth/callback#access_token=x&type=recovery'])assert.throws(()=>parsePasswordLink(href));
});
test('reset request uses fixed same-origin callback and never reveals account existence',async()=>{
  let captured;transport.auth.resetPasswordForEmail=async(email,options)=>{captured={email,options};return {error:{code:'user_not_found'}};};
  const notice=await requestPasswordRecovery(' TEST@EXAMPLE.INVALID ',{origin});
  assert.equal(captured.email,'test@example.invalid');assert.equal(captured.options.redirectTo,origin+'/auth/callback');
  assert.match(notice,/Se este e-mail/);
  await assert.rejects(requestPasswordRecovery('test@example.invalid',{origin:'http://example.invalid'}));
});

test('hosted generic OTP AMR is accepted only after verifyOtp validates recovery token type',async()=>{
  const a=fixture({method:'otp'});await a.controller.begin(origin+'/auth/callback?token_hash=test-only-hash&type=recovery');
  await a.controller.finish('new-test-password-unique','new-test-password-unique');assert.ok(a.calls.includes('updateUser'));
  const b=fixture({method:'otp'});await assert.rejects(b.controller.begin(implicit));assert.equal(b.calls.includes('updateUser'),false);
});
test('a recovery link cannot bypass an enabled authenticator before password mutation',async()=>{
  const f=fixture({method:'otp',mfaRequired:true});
  const result=await f.controller.begin(origin+'/auth/callback?token_hash=test-only-hash&type=recovery');
  assert.equal(result.requiresMfa,true);
  await assert.rejects(f.controller.finish('new-test-password-unique','new-test-password-unique'),error=>error.code==='MFA_REQUIRED');
  assert.equal(f.calls.includes('updateUser'),false);
  f.confirmMfa();
  await f.controller.finish('new-test-password-unique','new-test-password-unique');
  assert.equal(f.calls.filter(call=>call==='updateUser').length,1);
});
