import test from 'node:test';
import assert from 'node:assert/strict';
import { createTabSessionStorage, createSessionRestorer, prepareSessionSignIn } from '../src/lib/browserSession.js';

function backing() {
  const data=new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}
const adapter=(store,runtime='sb-project-runtime-a')=>createTabSessionStorage({storageKey:runtime,stableKey:'sb-project-auth-token',getStorage:()=>store});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));

test('new runtime restores only this tab transport under stable project namespace',()=>{
  const tab=backing(),one=adapter(tab);
  one.setItem('sb-project-runtime-a',JSON.stringify({access_token:'test-transport'}));
  one.setItem('sb-project-runtime-a-code-verifier','test-verifier');
  const reload=adapter(tab,'sb-project-runtime-b');
  assert.equal(reload.getItem('sb-project-runtime-b'),one.getItem('sb-project-runtime-a'));
  assert.equal(reload.getItem('sb-project-runtime-b-code-verifier'),'test-verifier');
  assert.equal(adapter(backing(),'sb-project-runtime-other-tab').getItem('sb-project-runtime-other-tab'),null);
  assert.deepEqual([...tab.data.keys()].sort(),['sb-project-auth-token','sb-project-auth-token-code-verifier']);
});
test('blocked getter or quota errors fall back only to memory and do not crash login',()=>{
  for(const getStorage of [()=>{throw new DOMException('Blocked','SecurityError');},()=>({getItem:()=>null,setItem:()=>{throw new DOMException('Full','QuotaExceededError');},removeItem:()=>{}})]){
    const session=createTabSessionStorage({storageKey:'sb-runtime',stableKey:'sb-stable',getStorage});
    assert.doesNotThrow(()=>session.setItem('sb-runtime','test-transport'));
    assert.equal(session.getItem('sb-runtime'),'test-transport');
    assert.doesNotThrow(()=>session.beginLogout());
    assert.equal(session.getItem('sb-runtime'),null);
  }
});
test('logout removes physical old credentials even after a quota error forced memory fallback',()=>{
  const tab=backing();tab.setItem('sb-project-auth-token','old-transport');
  tab.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};
  const session=adapter(tab);
  session.setItem('sb-project-runtime-a','new-test-transport');
  session.beginLogout();
  assert.equal(tab.getItem('sb-project-auth-token'),null);
  assert.equal(adapter(tab,'sb-project-runtime-b').getItem('sb-project-runtime-b'),null);
});
test('logout clears immediately and rejects token refresh writes that arrive late',()=>{
  const tab=backing(),session=adapter(tab);
  session.setItem('sb-project-runtime-a',JSON.stringify({access_token:'test-token'}));
  const logout=session.beginLogout();
  assert.equal(logout.token,'test-token');
  assert.equal(tab.getItem('sb-project-auth-token'),null);
  session.setItem('sb-project-runtime-a','late-refresh');
  assert.equal(session.getItem('sb-project-runtime-a'),null);
  assert.equal(adapter(tab,'sb-project-runtime-b').getItem('sb-project-runtime-b'),null);
  session.allowSignIn();session.setItem('sb-project-runtime-a','new-login');
  session.finishLogout(logout.operation);
  assert.equal(session.getItem('sb-project-runtime-a'),'new-login');
});
test('new sign-in drains an older SDK refresh lock before accepting new session writes',async()=>{
  const gate=deferred(),tab=backing(),session=adapter(tab),calls=[];
  const client={auth:{stopAutoRefresh:async()=>{calls.push('stop');},getSession:async()=>{calls.push('drain');await gate.promise;}}};
  const prepare=prepareSessionSignIn(client,session);
  await Promise.resolve();await Promise.resolve();
  session.setItem('sb-project-runtime-a','old-user-refresh');
  assert.equal(session.getItem('sb-project-runtime-a'),null);
  gate.resolve();await prepare;
  session.setItem('sb-project-runtime-a','new-user-login');
  assert.deepEqual(calls,['stop','drain']);
  assert.equal(session.getItem('sb-project-runtime-a'),'new-user-login');
});
function restorer(getProfile) {
  const calls=[];
  const controller=createSessionRestorer({getProfile,onProfile:profile=>calls.push(['profile',profile]),onReady:()=>calls.push(['ready']),onRestore:profile=>calls.push(['restore',profile]),onAnonymous:()=>calls.push(['anonymous'])});
  return {controller,calls};
}
test('verified restore redirects once; periodic validation never forces navigation',async()=>{
  const profile={authUserId:'test-id',role:'administrador'},f=restorer(async()=>profile);
  await f.controller.validate();await f.controller.validate();
  assert.equal(f.calls.filter(([call])=>call==='restore').length,1);
  assert.equal(f.calls.filter(([call])=>call==='profile').length,2);
  f.controller.dispose();
});
test('unverified/removed identity and profile failures never restore a private dashboard',async()=>{
  for(const getProfile of [async()=>null,async()=>{throw new Error('Auth denied');}]){
    const f=restorer(getProfile);await f.controller.validate();
    assert.equal(f.calls.some(([call])=>call==='restore'),false);
    assert.deepEqual(f.calls.find(([call])=>call==='profile'),['profile',null]);
    f.controller.dispose();
  }
});
test('initial SIGNED_IN invalidates an older read and schedules fresh verification outside auth lock',async()=>{
  const gate=deferred();let reads=0;
  const f=restorer(async()=>{reads++;return reads===1?gate.promise:{authUserId:'fresh-user'};});
  const initial=f.controller.validate();
  f.controller.event('SIGNED_IN');
  assert.equal(reads,1);
  await tick();gate.resolve({authUserId:'stale-user'});await initial;
  assert.deepEqual(f.calls.filter(([call])=>call==='profile'),[['profile',{authUserId:'fresh-user'}]]);
  assert.equal(f.calls.filter(([call])=>call==='restore').length,1);
  f.controller.dispose();
});
test('logout cancels pending verification and auth events so stale profile cannot return',async()=>{
  const gate=deferred(),f=restorer(()=>gate.promise);
  const pending=f.controller.validate();f.controller.event('TOKEN_REFRESHED');f.controller.beginLogout();
  gate.resolve({authUserId:'old-user'});await pending;await tick();
  assert.deepEqual(f.calls.filter(([call])=>call==='profile'),[['profile',null]]);
  assert.equal(f.calls.some(([call])=>call==='restore'),false);
  f.controller.dispose();
});
test('signed-out events verify the actual local session instead of trusting event payload',async()=>{
  const f=restorer(async()=>({authUserId:'local-tab-user'}));
  await f.controller.validate();f.controller.event('SIGNED_OUT');await tick();
  assert.equal(f.calls.some(([call])=>call==='anonymous'),false);
  assert.deepEqual(f.calls.filter(([call])=>call==='profile').at(-1),['profile',{authUserId:'local-tab-user'}]);
  f.controller.dispose();
});
