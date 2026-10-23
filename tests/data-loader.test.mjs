import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDataResources, applyHydratedRows, canLoadDataset, enrichRentalReferencesWhenReady } from '../src/lib/loadDataResources.js';
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}

test('O.S., notices and logs metadata publish while attachment signing is still pending',async()=>{
  const attachments=deferred(),seen=[];
  const result=await loadDataResources([
    {key:'inspections',load:async()=>[{id:'inspection',photo:'storage://private/photo'}]},
    {key:'service_orders',load:async()=>[{id:'order'}]},
    {key:'investor_notices',hydrate:false,load:async()=>[{id:'notice'}]},
    {key:'system_logs',hydrate:false,load:async()=>[{id:'log'}]},
  ],{onData:key=>seen.push(key),onError:error=>assert.fail(error),hydrate:()=>attachments.promise});
  assert.deepEqual(new Set(seen),new Set(['inspections','service_orders','investor_notices','system_logs']));
  attachments.resolve([]);await result.hydration;
});
test('failure in one table is visible and preserves its prior snapshot while peers load',async()=>{
  const rows={inspections:[{id:'previous'}]},failures=[];
  const result=await loadDataResources([
    {key:'inspections',load:async()=>{throw Object.assign(new Error('query failed'),{code:'NETWORK'});}},
    {key:'service_orders',load:async()=>[{id:'order'}]},
    {key:'system_logs',load:async()=>[{id:'log'}]},
  ],{onData:(key,data)=>{rows[key]=data;},onError:(key,error)=>failures.push([key,error.code])});
  assert.deepEqual(failures,[['inspections','NETWORK']]);
  assert.equal(rows.inspections[0].id,'previous');assert.equal(rows.service_orders.length,1);assert.equal(rows.system_logs.length,1);
  await result.hydration;
});
test('a stalled table times out without blocking peers or later publishing stale results',async()=>{
  const waiting=deferred(),seen=[],failures=[];
  const result=await loadDataResources([{key:'slow',load:()=>waiting.promise},{key:'system_logs',load:async()=>[{id:'log'}]}],{
    timeoutMs:10,onData:key=>seen.push(key),onError:(key,error)=>failures.push([key,error.code]),
  });
  assert.deepEqual(seen,['system_logs']);assert.deepEqual(failures,[['slow','TIMEOUT']]);
  waiting.resolve([{id:'late'}]);await result.hydration;await Promise.resolve();assert.deepEqual(seen,['system_logs']);
});
test('attachment signing failure cannot erase already loaded records',async()=>{
  let rows,warning;
  const result=await loadDataResources([{key:'vehicles',load:async()=>[{id:'vehicle',document:'storage://private/doc'}]}],{
    onData:(_key,data)=>{rows=data;},onError:error=>assert.fail(error),
    hydrate:async()=>{throw new Error('storage unavailable');},onAttachmentError:key=>{warning=key;},
  });
  await result.hydration;assert.equal(rows[0].id,'vehicle');assert.equal(rows[0].document,'storage://private/doc');assert.equal(warning,'vehicles');
});
test('logout cancels metadata and hydration callbacks from the old session',async()=>{
  const waiting=deferred();let active=true;const seen=[];
  const loading=loadDataResources([{key:'private',load:()=>waiting.promise}],{isActive:()=>active,onData:key=>seen.push(key),onError:error=>assert.fail(error)});
  active=false;waiting.resolve([{id:'private'}]);await loading;assert.deepEqual(seen,[]);
  const signing=deferred();active=true;
  const result=await loadDataResources([{key:'private',load:async()=>[{id:'private'}]}],{isActive:()=>active,onData:()=>{},onError:error=>assert.fail(error),hydrate:()=>signing.promise,onHydrated:()=>seen.push('hydrated')});
  active=false;signing.resolve([{id:'private',photo:'signed'}]);await result.hydration;assert.deepEqual(seen,[]);
});
test('hydration preserves edits, newly added records, deletion and reordering by ID',()=>{
  const original=[{id:'a',name:'old name',docs:{photo:'storage://private/a'}},{id:'b',docs:{photo:'storage://private/b'}},{id:'deleted',name:'removed'}];
  const hydrated=[{id:'a',name:'old name',docs:{photo:'https://signed.invalid/a'}},{id:'b',docs:{photo:'https://signed.invalid/b'}},{id:'deleted',name:'removed'}];
  const current=[{id:'new',name:'new record'},original[1],{...original[0],name:'edited name'}];
  const next=applyHydratedRows(current,original,hydrated);
  assert.deepEqual(next.map(item=>item.id),['new','b','a']);assert.equal(next[0].name,'new record');
  assert.equal(next[2].name,'edited name');assert.equal(next[2].docs.photo,'https://signed.invalid/a');
});
test('document edits made during hydration are not reverted to a previous URL',()=>{
  const original=[{id:'a',docs:{photo:'storage://private/old',photos:['storage://private/old']}}];
  const hydrated=[{id:'a',docs:{photo:'https://signed.invalid/old',photos:['https://signed.invalid/old']}}];
  const current=[{id:'a',docs:{photo:'storage://private/new',photos:['storage://private/old','storage://private/new']}}];
  const next=applyHydratedRows(current,original,hydrated);
  assert.equal(next[0].docs.photo,'storage://private/new');assert.deepEqual(next[0].docs.photos,current[0].docs.photos);
});
test('inspections configured for lazy attachments never sign the complete dataset',async()=>{
  let signed=0,visible=0;
  const result=await loadDataResources([{key:'inspections',hydrate:false,load:async()=>Array.from({length:2490},(_,id)=>({id,photo:'storage://private/photo'}))}],{
    onData:(_key,rows)=>{visible=rows.length;},onError:error=>assert.fail(error),hydrate:async rows=>{signed++;return rows;},
  });
  await result.hydration;assert.equal(visible,2490);assert.equal(signed,0);
});

test('an unavailable signed URL never replaces a stable document reference with null',()=>{
  const original=[{id:'a',docs:{photo:'storage://La-locacao/document/photo',photos:['https://supabase.invalid/storage/v1/object/public/La-locacao/a']}}];
  const hydrated=[{id:'a',docs:{photo:null,photos:[null]}}];
  const result=applyHydratedRows(original,original,hydrated);
  assert.equal(result[0].docs.photo,original[0].docs.photo);assert.deepEqual(result[0].docs.photos,original[0].docs.photos);
});

test('client requests only datasets permitted by the profile module map',()=>{
  assert.equal(canLoadDataset(null,'inspections'),false);
  const staff={role:'funcionario',modules:['vistoria']};
  assert.equal(canLoadDataset(staff,'vehicles'),true);assert.equal(canLoadDataset(staff,'inspections'),true);
  for(const table of ['system_logs','clients','investor_notices','service_orders','transactions']) assert.equal(canLoadDataset(staff,table),false);
  assert.equal(canLoadDataset({role:'gerente',modules:['logs']},'system_logs'),true);
  assert.equal(canLoadDataset({role:'investidor'},'clients'),false);assert.equal(canLoadDataset({role:'investidor'},'rentals'),true);
});
test('optional workshop finance loads only in its dedicated portal',()=>{
  const admin={role:'administrador'};
  assert.equal(canLoadDataset(admin,'workshop_financials'),false);
  assert.equal(canLoadDataset(admin,'workshop_financials',{includeWorkshopFinancials:true}),true);
  for(const table of ['inspections','service_orders','investor_notices','system_logs']) assert.equal(canLoadDataset(admin,table),true);
});

test('Avisos can load notices while investor profiles, finances and unrelated business datasets stay unavailable',()=>{
  for(const role of ['funcionario','gerente']){
    const profile={role,modules:['avisos']};
    assert.equal(canLoadDataset(profile,'investor_notices'),true);
    assert.equal(canLoadDataset(profile,'notice_recipients'),true);
    for(const table of ['investors','vehicles','clients','rentals','transactions','system_users','system_logs','inspections']) assert.equal(canLoadDataset(profile,table),false);
  }
  assert.equal(canLoadDataset({role:'funcionario',modules:['investidores']},'investor_notices'),true);
  assert.equal(canLoadDataset({role:'funcionario',modules:['investidores']},'notice_recipients'),false);
  assert.equal(canLoadDataset({role:'investidor',modules:['avisos']},'system_users'),false);
});

test('rental enrichment waits for separately arriving vehicle and client dependencies',()=>{
  const snapshots={rentals:[{id:'r',vehicleId:'v',clientId:'c',name:'original'}]};
  let current=snapshots.rentals;
  let enrichCalls=0;
  const enrich=(rentals,vehicles,clients)=>{enrichCalls++;return rentals.map(row=>({...row,vehicle:vehicles.find(v=>v.id===row.vehicleId)?.model||'',address:clients.find(c=>c.id===row.clientId)?.address||''}));};
  current=enrichRentalReferencesWhenReady(current,snapshots,enrich);
  assert.equal(enrichCalls,0);assert.equal(Object.hasOwn(current[0],'vehicle'),false);
  snapshots.vehicles=[{id:'v',model:'Filled model'}];
  current=enrichRentalReferencesWhenReady(current,snapshots,enrich);
  assert.equal(enrichCalls,0);assert.equal(Object.hasOwn(current[0],'address'),false);
  snapshots.clients=[{id:'c',address:'Filled address'}];
  current=enrichRentalReferencesWhenReady(current,snapshots,enrich);
  assert.equal(enrichCalls,1);assert.equal(current[0].vehicle,'Filled model');assert.equal(current[0].address,'Filled address');
});
test('an edit before rental dependencies arrive remains while new derived fields fill',()=>{
  const raw=[{id:'r',vehicleId:'v',clientId:'c',name:'original'}];
  const snapshots={rentals:raw,vehicles:[{id:'v',model:'Filled model'}]};
  let current=[{...raw[0],name:'edited by user',address:'user chosen address'}];
  const enrich=rentals=>rentals.map(row=>({...row,vehicle:'Filled model',address:'server address',vehicleYear:'2026'}));
  current=enrichRentalReferencesWhenReady(current,snapshots,enrich);
  assert.equal(current[0].vehicle,undefined);
  snapshots.clients=[{id:'c',address:'server address'}];
  current=enrichRentalReferencesWhenReady(current,snapshots,enrich);
  assert.equal(current[0].name,'edited by user');assert.equal(current[0].address,'user chosen address');
  assert.equal(current[0].vehicle,'Filled model');assert.equal(current[0].vehicleYear,'2026');
});
