import test from 'node:test';
import assert from 'node:assert/strict';
import { requireVerifiedMfa } from '../lib/server/requireMfa.js';
import { verifyPasswordWithoutReplacingSession } from '../src/lib/passwordVerifier.js';

function fixture({ factors=[], aal='aal1' }={}) {
  const calls=[];
  const user={id:'test-user',email:'test@example.invalid',factors};
  const client={auth:{
    getUser:async token=>{calls.push(['getUser',token]);return {data:{user}};},
    getClaims:async token=>{calls.push(['getClaims',token]);return {data:{claims:{sub:user.id,aal}}};},
  }};
  return {user,client,calls};
}
test('conditional server protection validates original bearer identity and signed claims',async()=>{
  const f=fixture({factors:[{id:'test-factor',status:'verified'}],aal:'aal2'});
  const result=await requireVerifiedMfa(f.client,'test-original-bearer');
  assert.equal(result.mfaEnabled,true);
  assert.deepEqual(f.calls,[['getUser','test-original-bearer'],['getClaims','test-original-bearer']]);
});
test('accounts without verified external factors use ordinary password sessions',async()=>{
  for(const factors of [[],[{id:'unfinished',status:'unverified'}]]){
    const result=await requireVerifiedMfa(fixture({factors}).client,'original');
    assert.equal(result.mfaEnabled,false);
    assert.equal(result.user.id,'test-user');
  }
});
test('an external verified factor cannot bypass conditional server protection using AAL1',async()=>{
  const f=fixture({factors:[{id:'external-factor',status:'verified'}]});
  await assert.rejects(requireVerifiedMfa(f.client,'original'),error=>error.status===403&&error.code==='MFA_REQUIRED');
});
test('server rejects invalid signature, substituted subject, anonymous or missing identity',async()=>{
  for(const mode of ['signature','subject','anonymous','missing']){
    const f=fixture();
    if(mode==='signature')f.client.auth.getClaims=async()=>({error:{}});
    if(mode==='subject')f.client.auth.getClaims=async()=>({data:{claims:{sub:'other',aal:'aal2'}}});
    if(mode==='anonymous')f.user.is_anonymous=true;
    if(mode==='missing')f.client.auth.getUser=async()=>({data:{user:null},error:{}});
    await assert.rejects(requireVerifiedMfa(f.client,'original'),error=>error.status===401);
  }
});
test('password confirmation preserves the panel session and clears its isolated verifier',async()=>{
  const f=fixture();let ended=false;
  f.client.auth.signInWithPassword=()=>{throw new Error('Do not replace the panel session');};
  const factory=()=>({auth:{
    signInWithPassword:async attributes=>{assert.equal(attributes.email,f.user.email);return {data:{user:{id:f.user.id}}};},
    signOut:async({scope})=>{assert.equal(scope,'local');ended=true;return {};},
  }});
  assert.equal(await verifyPasswordWithoutReplacingSession(f.client,factory,'test-password'),true);
  assert.equal(ended,true);
});
test('password confirmation rejects another identity and cleans up failed verification',async()=>{
  for(const result of [{error:{}},{data:{user:{id:'another-user'}}}]){
    const f=fixture();let ended=false;
    const factory=()=>({auth:{signInWithPassword:async()=>result,signOut:async()=>{ended=true;return {};}}});
    assert.equal(await verifyPasswordWithoutReplacingSession(f.client,factory,'test-password'),false);
    assert.equal(ended,true);
  }
});
