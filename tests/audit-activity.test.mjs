import test from 'node:test';
import assert from 'node:assert/strict';
import { recordActivity } from '../src/lib/auditActivity.js';
const event={action:'Criar',targetType:'Locação',targetId:'rental-id',description:'Saved rental'};
test('audit writes use a receipt RPC, never a table SELECT or caller identity/password',async()=>{
 let sent;
 const row={id:16000,created_at:'2026-10-23T23:00:00Z',action:event.action,target_id:event.targetId,user_email:'verified@example.invalid'};
 const client={rpc:async(name,body)=>{sent={name,body};return {data:{log:row},error:null};}};
 assert.equal(await recordActivity(client,{...event,userEmail:'forged',password:'do-not-log'}),row);
 assert.equal(sent.name,'record_system_activity');
 assert.deepEqual(Object.keys(sent.body).sort(),['p_action','p_description','p_details','p_target_id','p_target_type']);
 assert.ok(!JSON.stringify(sent).includes('do-not-log'));
});
test('audit failure and empty or mismatching receipts never confirm persistence',async()=>{
 await assert.rejects(recordActivity({rpc:async()=>({error:{code:'42501'}})},event),e=>e.code==='42501');
 for(const log of [null,{}, {id:1,created_at:'now',action:event.action,target_id:'wrong'}]) await assert.rejects(recordActivity({rpc:async()=>({data:{log}})},event));
});
