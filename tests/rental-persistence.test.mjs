import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRentalCommand, createRentalPersistence } from '../src/lib/rentalPersistence.js';

const OWNER='10000000-0000-4000-8000-000000000001';
const OTHER_OWNER='10000000-0000-4000-8000-000000000002';
const REQUEST='20000000-0000-4000-8000-000000000001';
const RENTAL='30000000-0000-4000-8000-000000000001';
const VEHICLE='40000000-0000-4000-8000-000000000001';
const OTHER_VEHICLE='40000000-0000-4000-8000-000000000002';
const CLIENT='50000000-0000-4000-8000-000000000001';
const TRANSACTION='60000000-0000-4000-8000-000000000001';
const PROJECT='https://ucfzkzpmvjekgotexriq.supabase.co';
const clone=value=>structuredClone(value);
const gate=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const file=()=>new File(['synthetic fixture only'],'contract.pdf',{type:'application/pdf'});
const rental=(overrides={})=>({requestId:REQUEST,vehicleId:VEHICLE,user:'Synthetic driver',plate:'TEST123',startDate:'2026-10-23',birthDate:'1990-01-01',cnhValidity:'2028-01-01',value:'R$ 1.400,50',depositTotal:'500,00',depositPaid:'100,00',tireTax:'25',lateFine:'10',dailyInterest:'1',durationWeeks:'4',depositInstallments:2,paymentDay:1,docs:{},...overrides});
const receipt=parameters=>({rental:{...clone(parameters.p_rental),id:parameters.p_rental_id||RENTAL,id_cliente:parameters.p_rental.id_cliente||CLIENT},client:{id:parameters.p_rental.id_cliente||CLIENT},vehicle:{id:parameters.p_rental.id_veiculo,status:'Alugado'},transactions:[{id:TRANSACTION}]});

function fixture({upload,respond,timeoutMs=100}={}){
  const uploads=[],calls=[],signals=[];
  const uploadFile=async(value,folder)=>{
    uploads.push({value,folder});
    return upload?upload(value,folder,uploads.length):PROJECT+'/storage/v1/object/sign/La-locacao/'+folder+'/synthetic.pdf?token=synthetic-token-never-persist';
  };
  const client={rpc(name,parameters){
    calls.push({name,parameters:clone(parameters)});
    const count=calls.length;let requestSignal;
    return {abortSignal(signal){requestSignal=signal;signals.push(signal);return this;},then(resolve,reject){return Promise.resolve().then(()=>respond?respond(name,parameters,count,requestSignal):{data:receipt(parameters),error:null}).then(resolve,reject);}};
  }};
  const persistence=createRentalPersistence({client,uploadFile,projectUrl:PROJECT,timeoutMs});
  return {persistence,uploads,calls,signals};
}

test('stable references strip signing credentials before RPC without mutating selected files or original data',async()=>{
  const input=rental({docs:{cnh:PROJECT+'/storage/v1/object/sign/La-locacao/condutores/old.pdf?token=synthetic-secret',residence:'storage://La-locacao/condutores/residence.png',appPrints:[]}});
  const before=clone(input),f=fixture();
  await f.persistence.save(input,{ownerId:OWNER});
  const docs=f.calls[0].parameters.p_rental.documentos;
  assert.equal(docs.cnh,'storage://La-locacao/condutores/old.pdf');
  assert.equal(docs.residence,'storage://La-locacao/condutores/residence.png');
  assert.equal(JSON.stringify(f.calls).includes('synthetic-secret'),false);
  assert.equal(f.uploads.length,0);assert.deepEqual(input,before);
});

test('uploaded File receipt is reused after a lost RPC response with identical request and payload',async()=>{
  const attachment=file(),input=rental({docs:{signedContract:attachment}});
  const f=fixture({respond:(_name,parameters,count)=>{if(count===1)throw new Error('Synthetic response lost');return {data:receipt(parameters),error:null};}});
  await assert.rejects(f.persistence.save(input,{ownerId:OWNER}),/response lost/);
  const saved=await f.persistence.save(input,{ownerId:OWNER});
  assert.equal(saved.rental.id,RENTAL);assert.equal(f.uploads.length,1);assert.equal(f.calls.length,2);
  assert.deepEqual(f.calls[0],f.calls[1]);assert.equal(f.calls[0].parameters.p_request_id,REQUEST);
  assert.equal(input.docs.signedContract,attachment);assert.equal(await attachment.text(),'synthetic fixture only');
  assert.equal(f.calls[1].parameters.p_rental.contrato_assinado,'storage://La-locacao/condutores/contratos/synthetic.pdf');
});

test('concurrent retries single-flight the file and send the same idempotency command',async()=>{
  const uploaded=gate(),attachment=file(),input=rental({docs:{signedContract:attachment}});
  const f=fixture({upload:()=>uploaded.promise});
  const first=f.persistence.save(input,{ownerId:OWNER}),second=f.persistence.save(input,{ownerId:OWNER});
  await flush();assert.equal(f.uploads.length,1);
  uploaded.resolve('storage://La-locacao/condutores/contratos/same.pdf');
  await Promise.all([first,second]);assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0],f.calls[1]);
});

test('failed upload never calls RPC and can be retried without losing the File',async()=>{
  const attachment=file(),input=rental({docs:{cnh:attachment}});
  const f=fixture({upload:(_value,_folder,count)=>{if(count===1)throw new Error('Synthetic upload failed');return 'storage://La-locacao/condutores/documentos/retried.pdf';}});
  await assert.rejects(f.persistence.save(input,{ownerId:OWNER}),/upload failed/);
  assert.equal(f.calls.length,0);assert.equal(input.docs.cnh,attachment);
  await f.persistence.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,2);assert.equal(f.calls.length,1);
});

test('RPC permission denial propagates unchanged while preserving Files and successful upload receipts',async()=>{
  const denied={code:'42501',message:'Synthetic permission denied'},attachment=file(),input=rental({docs:{cnh:attachment}});
  const f=fixture({respond:(_name,parameters,count)=>count===1?{data:null,error:denied}:{data:receipt(parameters),error:null}});
  await assert.rejects(f.persistence.save(input,{ownerId:OWNER}),error=>error===denied);
  assert.equal(input.docs.cnh,attachment);assert.equal(await attachment.text(),'synthetic fixture only');
  await f.persistence.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,1);
});

test('zero-row, malformed and mismatching receipts cannot be presented as a confirmed save',async()=>{
  for(const change of [
    ()=>null,
    ()=>[],
    value=>({...value,rental:null}),
    value=>({...value,transactions:null}),
    value=>({...value,vehicle:{id:OTHER_VEHICLE}}),
    value=>({...value,rental:{...value.rental,id_veiculo:OTHER_VEHICLE}}),
    value=>({...value,rental:{...value.rental,id:'not-a-real-uuid'}}),
  ]){
    const f=fixture({respond:(_name,parameters)=>({data:change(receipt(parameters)),error:null})});
    await assert.rejects(f.persistence.save(rental(),{ownerId:OWNER}),error=>error.code==='UNCONFIRMED_RESULT');
  }
  const f=fixture({respond:(_name,parameters)=>({data:{...receipt(parameters),rental:{...receipt(parameters).rental,id:OTHER_OWNER}},error:null})});
  await assert.rejects(f.persistence.save(rental({id:RENTAL}),{ownerId:OWNER,operation:'update'}),error=>error.code==='UNCONFIRMED_RESULT');
});

test('identity change and explicit clear discard late RPC success',async()=>{
  for(const mode of ['clear','new-owner']){
    const waiting=gate(),f=fixture({respond:(_name,parameters,count)=>count===1?waiting.promise:{data:receipt(parameters),error:null}});
    const pending=f.persistence.save(rental(),{ownerId:OWNER});await flush();
    if(mode==='clear')f.persistence.clear();else await f.persistence.save(rental(),{ownerId:OTHER_OWNER});
    waiting.resolve({data:receipt(f.calls[0].parameters),error:null});
    await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');
  }
});

test('clearing identity during upload stops remaining attachments and prevents RPC',async()=>{
  const waiting=gate(),f=fixture({upload:()=>waiting.promise});
  const input=rental({docs:{cnh:file(),residence:file(),signedContract:file()}});
  const pending=f.persistence.save(input,{ownerId:OWNER});await flush();assert.equal(f.uploads.length,1);
  f.persistence.clear();waiting.resolve('storage://La-locacao/condutores/documentos/first.pdf');
  await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');
  assert.equal(f.uploads.length,1);assert.equal(f.calls.length,0);
});

test('upload cache cannot be inherited by another verified owner or after an explicit clear',async()=>{
  const attachment=file(),input=rental({docs:{signedContract:attachment}}),f=fixture();
  await f.persistence.save(input,{ownerId:OWNER});
  await f.persistence.save(input,{ownerId:OWNER});assert.equal(f.uploads.length,1);
  await f.persistence.save(input,{ownerId:OTHER_OWNER});assert.equal(f.uploads.length,2);
  f.persistence.clear();await f.persistence.save(input,{ownerId:OTHER_OWNER});assert.equal(f.uploads.length,3);
});

test('create and update choose distinct RPC contracts and valid currency/date mappings',async()=>{
  const f=fixture(),input=rental({paymentDay:5});
  await f.persistence.save(input,{ownerId:OWNER});
  assert.equal(f.calls[0].name,'create_rental_atomic');assert.equal(f.calls[0].parameters.p_payment_day,5);assert.equal('p_rental_id' in f.calls[0].parameters,false);
  assert.equal(f.calls[0].parameters.p_rental.value,1400.5);assert.equal(f.calls[0].parameters.p_rental.documentos.payment_day,5);
  await f.persistence.save({...input,id:RENTAL,requestId:OTHER_OWNER,value:'983.33',rentalType:'daily'},{ownerId:OWNER,operation:'update'});
  assert.equal(f.calls[1].name,'update_rental_atomic');assert.equal(f.calls[1].parameters.p_rental_id,RENTAL);assert.equal('p_payment_day' in f.calls[1].parameters,false);
  assert.equal(f.calls[1].parameters.p_rental.value,983.33);assert.equal(f.calls[1].parameters.p_rental.imposto_de_pneus,0);
});

test('clearing the payment weekday explicitly clears an older document value',()=>{
  assert.equal(buildRentalCommand(rental({paymentDay:-1}),{payment_day:5}).rental.documentos.payment_day,null);
});

test('malformed dates, currency, IDs and private references reject before RPC or file upload',async()=>{
  for(const overrides of [
    {vehicleId:'not-uuid'}, {startDate:'23/10/2026'}, {startDate:'2026-02-30'}, {startDate:'2026-13-01'},
    {value:'++10'}, {value:'1,2,3'}, {value:true}, {value:{}}, {value:-1}, {value:Infinity},
    {docs:{residence:'https://attacker.invalid/file.pdf'}},
    {docs:{residence:'storage://La-locacao/../private.pdf'}},
    {docs:{residence:'javascript:alert(1)'}},
  ]){
    const attachment=file(),input=rental({docs:{cnh:attachment},...overrides}),f=fixture();
    await assert.rejects(f.persistence.save(input,{ownerId:OWNER}),error=>error.code==='RENTAL_INPUT');
    assert.equal(f.calls.length,0);assert.equal(f.uploads.length,0);
  }
});

test('preflight rejects an invalid later reference before uploading an otherwise valid File',async()=>{
  const f=fixture(),input=rental({docs:{cnh:file(),residence:'https://attacker.invalid/file.pdf'}});
  await assert.rejects(f.persistence.save(input,{ownerId:OWNER}));assert.equal(f.calls.length,0);assert.equal(f.uploads.length,0);
});

test('nested existing document references are normalized deeply without persisting signing tokens',async()=>{
  const signed=PROJECT+'/storage/v1/object/sign/La-locacao/contratos/term.pdf?token=synthetic-deep-secret';
  const input=rental({docs:{terminationTerm:signed,closureSummary:{attachments:[signed]}}}),f=fixture();
  await f.persistence.save(input,{ownerId:OWNER});
  const docs=f.calls[0].parameters.p_rental.documentos;
  assert.equal(docs.terminationTerm,'storage://La-locacao/contratos/term.pdf');
  assert.equal(docs.closureSummary.attachments[0],docs.terminationTerm);
  assert.equal(JSON.stringify(f.calls).includes('synthetic-deep-secret'),false);assert.equal(input.docs.terminationTerm,signed);
});

test('RPC timeout passes AbortSignal and cannot confirm a save from an unfinished response',async()=>{
  const f=fixture({timeoutMs:10,respond:(_name,_parameters,_count,signal)=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('Synthetic abort','AbortError')),{once:true});})});
  await assert.rejects(f.persistence.save(rental(),{ownerId:OWNER}),error=>error.name==='AbortError');
  assert.equal(f.signals[0].aborted,true);
});
