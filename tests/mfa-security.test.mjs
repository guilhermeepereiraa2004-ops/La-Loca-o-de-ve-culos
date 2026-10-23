import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { requireVerifiedMfa } from '../lib/server/requireMfa.js';

const hooks=registerHooks({
  resolve(specifier,context,next){
    if(specifier==='./supabase' && context.parentURL?.endsWith('/src/lib/mfa.js')) return {url:'mfa-test:sdk',shortCircuit:true};
    return next(specifier,context);
  },
  load(url,context,next){
    if(url==='mfa-test:sdk')return {format:'module',source:'export const supabase={}; export const createPasswordVerifier=()=>{};',shortCircuit:true};
    return next(url,context);
  },
});
const {createMfaController,getMfaStatusForUser,verifyPasswordWithoutReplacingSession}=await import('../src/lib/mfa.js');
hooks.deregister();

const factor=id=>({id,status:'verified',factor_type:'totp',friendly_name:'Test authenticator'});
function fixture({factors=[],aal='aal1',passwordValid=true}={}){
  const calls=[];
  let user={id:'mfa-test-user',email:'test@example.invalid',factors:[...factors]};
  let level=aal;
  let failVerification=false;
  const client={auth:{
    getUser:async(token)=>{calls.push(['getUser',token]);return {data:{user}};},
    getSession:async()=>({data:{session:{access_token:'test-original-bearer'}}}),
    getClaims:async(token)=>{calls.push(['getClaims',token]);return {data:{claims:{sub:user.id,aal:level}}};},
    mfa:{
      enroll:async()=>{calls.push(['enroll']);user.factors.push({id:'pending-test-factor',factor_type:'totp',status:'unverified'});return {data:{id:'pending-test-factor',totp:{qr_code:'<svg>test fixture only</svg>',secret:'TEST-ONLY-NOT-VALID'}}};},
      challengeAndVerify:async({factorId,code})=>{
        calls.push(['verify',factorId]);
        if(failVerification || code!=='123456')return {error:{}};
        user.factors.find(entry=>entry.id===factorId).status='verified';level='aal2';return {};
      },
      unenroll:async({factorId})=>{calls.push(['unenroll',factorId]);user.factors=user.factors.filter(entry=>entry.id!==factorId);return {};},
    },
  }};
  const verifierFactory=()=>({auth:{
    signInWithPassword:async()=>{calls.push(['password-check']);return passwordValid?{data:{user:{id:user.id}}}:{error:{}};},
    signOut:async({scope})=>{calls.push(['verifier-signout',scope]);return {};},
  }});
  return {client,controller:createMfaController({client,verifierFactory}),verifierFactory,calls,
    user:()=>user,level:()=>level,setLevel:value=>{level=value;},failCode:()=>{failVerification=true;},switchUser:()=>{user={id:'other-test-user',email:'other@example.invalid',factors:[]};}};
}
test('starting an unverified enrollment never imposes MFA or claims requirements',async()=>{
  const f=fixture({factors:[{id:'unfinished',status:'unverified',factor_type:'totp'}]});
  const status=await f.controller.status();
  assert.equal(status.enabled,false);assert.equal(status.required,false);
  assert.equal(f.calls.some(([call])=>call==='getClaims'),false);
});
test('verified factor requires cryptographically verified AAL2 for the same identity',async()=>{
  const f=fixture({factors:[factor('owned-factor')]});
  assert.equal((await f.controller.status()).required,true);
  f.client.auth.getClaims=async()=>({data:{claims:{sub:'forged-user',aal:'aal2'}}});
  await assert.rejects(f.controller.status(),/validar a segunda etapa/);
});
test('invalid OTP and foreign factor never upgrade access',async()=>{
  const f=fixture({factors:[factor('owned-factor')]});
  await assert.rejects(f.controller.verify('foreign-factor','123456'),/não disponível/);
  assert.equal(f.calls.some(([call])=>call==='verify'),false);
  await assert.rejects(f.controller.verify('owned-factor','654321'),/Código inválido/);
  assert.equal((await f.controller.status()).required,true);
  await assert.rejects(f.controller.verify('owned-factor','12345x'),/seis dígitos/);
});
test('a valid OTP grants AAL2 only after provider claims confirm it',async()=>{
  const f=fixture({factors:[factor('owned-factor')]});
  const status=await f.controller.verify('owned-factor','123456');
  assert.equal(status.required,false);assert.equal(status.currentLevel,'aal2');
  f.setLevel('aal1');
  f.client.auth.mfa.challengeAndVerify=async()=>({});
  await assert.rejects(f.controller.verify('owned-factor','123456'),/validar a segunda etapa/);
});
test('invalid current password cannot create a factor and ephemeral session is cleared',async()=>{
  const f=fixture({passwordValid:false});
  await assert.rejects(f.controller.enroll('test-password'),/Senha atual inválida/);
  assert.equal(f.calls.some(([call])=>call==='enroll'),false);
  assert.ok(f.calls.some(([call,scope])=>call==='verifier-signout'&&scope==='local'));
});
test('password step-up uses an isolated client and preserves the active AAL2 bearer',async()=>{
  const f=fixture({factors:[factor('owned-factor')],aal:'aal2'});
  f.client.auth.signInWithPassword=()=>{throw new Error('Must not replace active session');};
  assert.equal(await verifyPasswordWithoutReplacingSession(f.client,f.verifierFactory,'test-password'),true);
  assert.equal(f.level(),'aal2');assert.equal((await f.controller.status()).required,false);
});
test('unverified enrollment can be canceled without enabling or removing a verified factor',async()=>{
  const f=fixture();await f.controller.enroll('test-password');
  assert.equal((await f.controller.status()).enabled,false);
  await f.controller.cancelEnrollment();
  assert.ok(f.calls.some(([call,id])=>call==='unenroll'&&id==='pending-test-factor'));
  assert.equal(f.user().factors.length,0);
});
test('verified enrollment survives lost UI response and cancel',async()=>{
  const f=fixture();await f.controller.enroll('test-password');
  await f.client.auth.mfa.challengeAndVerify({factorId:'pending-test-factor',code:'123456'});
  await f.controller.cancelEnrollment();
  assert.equal(f.calls.some(([call])=>call==='unenroll'),false);
  assert.equal((await f.controller.status()).enabled,true);
});
test('enrollment is bound to its original user when an account changes',async()=>{
  const f=fixture();await f.controller.enroll('test-password');f.switchUser();
  await assert.rejects(f.controller.confirmEnrollment('123456'),/A conta mudou/);
  await f.controller.cancelEnrollment();
  assert.equal(f.calls.some(([call])=>call==='unenroll'||call==='verify'),false);
});
test('confirmation only activates a provider-verified factor and AAL2 session',async()=>{
  const f=fixture();await f.controller.enroll('test-password');
  const status=await f.controller.confirmEnrollment('123456');
  assert.equal(status.enabled,true);assert.equal(status.required,false);
  assert.equal(status.factors[0].id,'pending-test-factor');
});
test('removing the last authenticator is rejected and backup removal needs AAL2 and password',async()=>{
  const f=fixture({factors:[factor('only-factor')],aal:'aal2'});
  await assert.rejects(f.controller.removeBackupFactor('only-factor','test-password'),/Mantenha um autenticador/);
  assert.equal(f.calls.some(([call])=>call==='unenroll'),false);
  const pending=fixture({factors:[factor('one'),factor('two')]});
  await assert.rejects(pending.controller.removeBackupFactor('two','test-password'));
  const wrong=fixture({factors:[factor('one'),factor('two')],aal:'aal2',passwordValid:false});
  await assert.rejects(wrong.controller.removeBackupFactor('two','test-password'),/Senha atual inválida/);
  const valid=fixture({factors:[factor('one'),factor('two')],aal:'aal2'});
  await valid.controller.removeBackupFactor('two','test-password');
  assert.equal(valid.user().factors.length,1);assert.equal(valid.level(),'aal2');
});
test('server validates both original bearer identity and signed claims',async()=>{
  const f=fixture({factors:[factor('factor')],aal:'aal2'});
  const result=await requireVerifiedMfa(f.client,'test-original-bearer');
  assert.equal(result.mfaEnabled,true);
  assert.deepEqual(f.calls.filter(([call])=>call==='getUser'||call==='getClaims').map(([,token])=>token),['test-original-bearer','test-original-bearer']);
});
test('server denies a verified factor at AAL1 while optional or unfinished setup remains usable',async()=>{
  const f=fixture({factors:[factor('factor')]});
  await assert.rejects(requireVerifiedMfa(f.client,'original'),error=>error.status===403&&error.code==='MFA_REQUIRED');
  for(const factors of [[],[{id:'unfinished',status:'unverified'}]]){
    assert.equal((await requireVerifiedMfa(fixture({factors}).client,'original')).mfaEnabled,false);
  }
});
test('server rejects invalid signature, substituted subject, anonymous or missing identity',async()=>{
  for(const mode of ['signature','subject','anonymous','missing']){
    const f=fixture();
    if(mode==='signature')f.client.auth.getClaims=async()=>({error:{}});
    if(mode==='subject')f.client.auth.getClaims=async()=>({data:{claims:{sub:'other',aal:'aal2'}}});
    if(mode==='anonymous')f.user().is_anonymous=true;
    if(mode==='missing')f.client.auth.getUser=async()=>({data:{user:null},error:{}});
    await assert.rejects(requireVerifiedMfa(f.client,'original'),error=>error.status===401);
  }
});
