import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMaintenanceCommand, createMaintenancePersistence } from '../src/lib/maintenancePersistence.js';

const OWNER='10000000-0000-4000-8000-000000000001';
const OTHER_OWNER='10000000-0000-4000-8000-000000000002';
const REQUEST='20000000-0000-4000-8000-000000000001';
const MAINTENANCE='30000000-0000-4000-8000-000000000001';
const TRANSACTION='40000000-0000-4000-8000-000000000001';
const PROJECT='https://ucfzkzpmvjekgotexriq.supabase.co';
const file=()=>new File(['synthetic maintenance receipt'],'receipt.pdf',{type:'application/pdf'});
const gate=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const maintenance=(overrides={})=>({requestId:REQUEST,vehiclePlate:'TEST123',vehicleModel:'Synthetic vehicle',date:'2026-10-23',serviceType:'Synthetic service',value:'R$ 1.250,50',currentKm:'12000',provider:'Synthetic provider',responsible:'Administradora',observations:'Synthetic observation',receiptFiles:[],...overrides});
const receipt=params=>({maintenance:{...structuredClone(params.p_maintenance),id:params.p_maintenance_id||MAINTENANCE},transaction:{id:TRANSACTION,operation_key:'maintenance:'+(params.p_maintenance_id||MAINTENANCE),vehicle_plate:params.p_maintenance.vehicle_plate,type:'out',cat:'Manutenção',val:-Math.abs(params.p_maintenance.value)}});

function fixture({upload,respond,timeoutMs=100}={}){
  const uploads=[],calls=[],signals=[];
  const uploadFile=async(value,folder)=>{
    uploads.push({value,folder});
    return upload?upload(value,folder,uploads.length):PROJECT+'/storage/v1/object/sign/La-locacao/manutencoes/synthetic.pdf?token=synthetic-private-token';
  };
  const client={rpc(name,parameters){
    calls.push({name,parameters:structuredClone(parameters)});const count=calls.length;let signal;
    return {abortSignal(value){signal=value;signals.push(value);return this;},then(resolve,reject){return Promise.resolve().then(()=>respond?respond(name,parameters,count,signal):{data:receipt(parameters),error:null}).then(resolve,reject);}};
  }};
  return {store:createMaintenancePersistence({client,uploadFile,projectUrl:PROJECT,timeoutMs}),uploads,calls,signals};
}

test('maintenance create/update RPC uses allowlisted payload, stable IDs and parsed money/km',async()=>{
  const f=fixture(),input=maintenance();await f.store.save(input,{ownerId:OWNER});
  const first=f.calls[0];assert.equal(first.name,'save_maintenance_atomic');assert.equal(first.parameters.p_request_id,REQUEST);assert.equal(first.parameters.p_maintenance_id,null);
  assert.equal(first.parameters.p_maintenance.value,1250.5);assert.equal(first.parameters.p_maintenance.current_km,12000);assert.equal(first.parameters.p_maintenance.receipt_url,null);
  assert.equal('requestId' in first.parameters.p_maintenance,false);assert.equal('password' in first.parameters.p_maintenance,false);
  await f.store.save(maintenance({id:MAINTENANCE,requestId:OTHER_OWNER,value:'983.33'}),{ownerId:OWNER,operation:'update'});
  assert.equal(f.calls[1].parameters.p_maintenance_id,MAINTENANCE);assert.equal(f.calls[1].parameters.p_maintenance.value,983.33);
  assert.equal(buildMaintenanceCommand(maintenance({currentKm:''}),null).current_km,null);
});

test('lost RPC response retry reuses the uploaded receipt, request and exact payload',async()=>{
  const attachment=file(),input=maintenance({receiptFiles:[attachment]});
  const f=fixture({respond:(_name,params,count)=>{if(count===1)throw new Error('Synthetic lost response');return {data:receipt(params),error:null};}});
  await assert.rejects(f.store.save(input,{ownerId:OWNER}),/lost response/);
  await f.store.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,1);assert.equal(f.uploads[0].folder,'manutencoes');
  assert.deepEqual(f.calls[0],f.calls[1]);assert.equal(input.receiptFiles[0],attachment);assert.equal(await attachment.text(),'synthetic maintenance receipt');
});

test('signed existing/new receipts strip tokens, deduplicate and leave original input unchanged',async()=>{
  const old=PROJECT+'/storage/v1/object/sign/La-locacao/manutencoes/old.pdf?token=synthetic-old-token';
  const attachment=file(),input=maintenance({receiptUrl:old+',storage://La-locacao/manutencoes/other.pdf',receiptFiles:[attachment]});
  const f=fixture({upload:()=>old});await f.store.save(input,{ownerId:OWNER});
  assert.equal(f.calls[0].parameters.p_maintenance.receipt_url,'storage://La-locacao/manutencoes/old.pdf,storage://La-locacao/manutencoes/other.pdf');
  assert.equal(JSON.stringify(f.calls).includes('synthetic-old-token'),false);assert.equal(input.receiptUrl,old+',storage://La-locacao/manutencoes/other.pdf');assert.equal(input.receiptFiles[0],attachment);
});

test('preflight rejects malformed value/date/km/refs/files before upload or RPC',async()=>{
  for(const update of [
    {value:'++10'},{value:'1,2,3'},{value:-1},{value:Infinity},{value:{}},
    {date:'2026-02-30'},{date:'2026-13-01'},{currentKm:'-1'},{currentKm:'1.5'},
    {receiptUrl:'https://attacker.invalid/x.pdf'},{receiptUrl:'storage://La-locacao/../x.pdf'},
    {receiptFiles:'not-an-array'},{receiptFiles:[file(),'not-a-file']},
  ]){
    const f=fixture();await assert.rejects(f.store.save(maintenance({receiptFiles:[file()],...update}),{ownerId:OWNER}),error=>error.code==='MAINTENANCE_INPUT');
    assert.equal(f.uploads.length,0);assert.equal(f.calls.length,0);
  }
});

test('upload failure or invalid receipt response makes no RPC and preserves retryable File',async()=>{
  for(const output of [()=>{throw new Error('Synthetic upload failed');},()=>null,()=> 'https://attacker.invalid/foreign.pdf']){
    const attachment=file(),input=maintenance({receiptFiles:[attachment]}),f=fixture({upload:output});
    await assert.rejects(f.store.save(input,{ownerId:OWNER}));assert.equal(f.calls.length,0);assert.equal(input.receiptFiles[0],attachment);assert.equal(await attachment.text(),'synthetic maintenance receipt');
  }
  const f=fixture({upload:(_value,_folder,count)=>{if(count===1)throw new Error('Synthetic upload failed');return 'storage://La-locacao/manutencoes/retry.pdf';}}),input=maintenance({receiptFile:file()});
  await assert.rejects(f.store.save(input,{ownerId:OWNER}));await f.store.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,2);assert.equal(f.calls.length,1);
});

test('42501 failure preserves Files and successful receipt cache for a later permitted retry',async()=>{
  const denied={code:'42501',message:'Synthetic denial'},attachment=file(),input=maintenance({receiptFiles:[attachment]});
  const f=fixture({respond:(_name,params,count)=>count===1?{data:null,error:denied}:{data:receipt(params),error:null}});
  await assert.rejects(f.store.save(input,{ownerId:OWNER}),error=>error===denied);
  await f.store.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,1);assert.equal(input.receiptFiles[0],attachment);
});

test('clear/owner change prevents stale upload and RPC completion from updating the UI',async()=>{
  const uploadGate=gate(),f=fixture({upload:()=>uploadGate.promise});
  const pending=f.store.save(maintenance({receiptFiles:[file(),file()]}),{ownerId:OWNER});await flush();assert.equal(f.uploads.length,1);
  f.store.clear();uploadGate.resolve('storage://La-locacao/manutencoes/first.pdf');
  await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');assert.equal(f.uploads.length,1);assert.equal(f.calls.length,0);
  for(const mode of ['clear','other-owner']){
    const rpcGate=gate(),g=fixture({respond:(_name,params,count)=>count===1?rpcGate.promise:{data:receipt(params),error:null}});
    const old=g.store.save(maintenance(),{ownerId:OWNER});await flush();
    if(mode==='clear')g.store.clear();else await g.store.save(maintenance(),{ownerId:OTHER_OWNER});
    rpcGate.resolve({data:receipt(g.calls[0].parameters),error:null});await assert.rejects(old,error=>error.code==='SESSION_CHANGED');
  }
});

test('receipt cache is isolated by verified owner and explicit clearing',async()=>{
  const attachment=file(),input=maintenance({receiptFiles:[attachment]}),f=fixture();
  await f.store.save(input,{ownerId:OWNER});await f.store.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,1);
  await f.store.save(input,{ownerId:OTHER_OWNER});assert.equal(f.uploads.length,2);
  f.store.clear();await f.store.save(input,{ownerId:OTHER_OWNER});assert.equal(f.uploads.length,3);
});

test('invalid/zero-row/mismatching receipts reject a confirmed maintenance result',async()=>{
  for(const change of [
    ()=>null,value=>({...value,maintenance:null}),value=>({...value,transaction:null}),
    value=>({...value,maintenance:{...value.maintenance,id:'invalid'}}),
    value=>({...value,maintenance:{...value.maintenance,vehicle_plate:'OTHER123'}}),
    value=>({...value,transaction:{...value.transaction,operation_key:'maintenance:'+OTHER_OWNER}}),
    value=>({...value,transaction:{...value.transaction,vehicle_plate:'OTHER123'}}),
  ]){
    const f=fixture({respond:(_name,params)=>({data:change(receipt(params)),error:null})});
    await assert.rejects(f.store.save(maintenance(),{ownerId:OWNER}),error=>error.code==='UNCONFIRMED_RESULT');
  }
  const f=fixture({respond:(_name,params)=>({data:{...receipt(params),maintenance:{...receipt(params).maintenance,id:OTHER_OWNER}},error:null})});
  await assert.rejects(f.store.save(maintenance({id:MAINTENANCE}),{ownerId:OWNER,operation:'update'}),error=>error.code==='UNCONFIRMED_RESULT');
});

test('clearReceipts update detaches old references, adds new files and never changes original form data',async()=>{
  const attachment=file(),input=maintenance({id:MAINTENANCE,clearReceipts:true,receiptUrl:'storage://La-locacao/manutencoes/old.pdf',receiptFiles:[attachment]}),f=fixture();
  await f.store.save(input,{ownerId:OWNER,operation:'update'});
  assert.equal(f.calls[0].parameters.p_maintenance.receipt_url,'storage://La-locacao/manutencoes/synthetic.pdf');
  assert.equal(input.receiptUrl,'storage://La-locacao/manutencoes/old.pdf');assert.equal(input.clearReceipts,true);assert.equal(input.receiptFiles[0],attachment);
  const clearOnly=fixture();await clearOnly.store.save(maintenance({id:MAINTENANCE,clearReceipts:true,receiptUrl:input.receiptUrl}),{ownerId:OWNER,operation:'update'});
  assert.equal(clearOnly.calls[0].parameters.p_maintenance.receipt_url,null);assert.equal(clearOnly.uploads.length,0);
});

test('timeout aborts RPC and invalid identity/request never starts transport',async()=>{
  const f=fixture({timeoutMs:10,respond:(_name,_params,_count,signal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Synthetic abort','AbortError')),{once:true}))});
  await assert.rejects(f.store.save(maintenance(),{ownerId:OWNER}),error=>error.name==='AbortError');assert.equal(f.signals[0].aborted,true);
  for(const [input,options] of [[maintenance(),{}],[maintenance({requestId:'invalid'}),{ownerId:OWNER}],[maintenance(),{ownerId:OWNER,operation:'delete'}],[maintenance({id:'invalid'}),{ownerId:OWNER,operation:'update'}]]){
    const g=fixture();await assert.rejects(g.store.save(input,options),error=>error.code==='MAINTENANCE_INPUT');assert.equal(g.calls.length,0);assert.equal(g.uploads.length,0);
  }
});
