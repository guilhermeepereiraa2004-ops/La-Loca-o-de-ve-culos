import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoticePersistence, buildNoticeCommand, normalizeNoticeVideoUrl } from '../src/lib/noticePersistence.js';

const OWNER='10000000-0000-4000-8000-000000000001';
const OTHER='10000000-0000-4000-8000-000000000002';
const REQUEST='20000000-0000-4000-8000-000000000001';
const NOTICE='30000000-0000-4000-8000-000000000001';
const RECIPIENT='40000000-0000-4000-8000-000000000001';
const VIDEO='AbCdEf012_-';
const input=(overrides={})=>({requestId:REQUEST,title:'Aviso sintético',message:'Mensagem de teste',...overrides});
const row=(overrides={})=>({id:NOTICE,title:'Aviso sintético',message:'Mensagem de teste',video_url:null,target_type:'all',target_ids:null,read_by:[],created_by:'Autor sintético',created_at:'2026-10-23T18:00:00+00:00',...overrides});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture(handler){
  const calls=[];
  const client={rpc(name,params){
    const call={name,params:structuredClone(params)};calls.push(call);
    const promise=Promise.resolve().then(()=>handler?handler(call,calls.length):({data:{notice:row({...params.p_notice,id:params.p_id||NOTICE})},error:null}));
    return {abortSignal(signal){call.signal=signal;return promise;},then:promise.then.bind(promise)};
  }};
  return {calls,store:createNoticePersistence({client,timeoutMs:100})};
}

test('create uses the exact notice RPC DTO and does not mutate the input',async()=>{
  const f=fixture(),notice=input({videoUrl:`https://youtu.be/${VIDEO}?si=share123&t=10`}),original=structuredClone(notice);
  const result=await f.store.save(notice,{ownerId:OWNER});
  assert.equal(f.calls[0].name,'save_notice');
  assert.deepEqual(f.calls[0].params,{p_id:null,p_request_id:REQUEST,p_notice:{title:notice.title,message:notice.message,video_url:`https://www.youtube.com/watch?v=${VIDEO}`,target_type:'all',target_ids:null}});
  assert.equal(result.notice.id,NOTICE);assert.deepEqual(notice,original);
});

test('title/message editing preserves omitted video, audience, readers and original author/time',async()=>{
  const existing=row({video_url:`https://youtu.be/${VIDEO}?si=oldshare`,target_type:'selected',target_ids:[RECIPIENT],read_by:[RECIPIENT]});
  const f=fixture(call=>({data:{notice:{...existing,...call.params.p_notice}},error:null}));
  const result=await f.store.save({id:NOTICE,requestId:REQUEST,title:'Título corrigido'},{ownerId:OWNER,operation:'update'});
  assert.deepEqual(f.calls[0].params.p_notice,{title:'Título corrigido'});
  assert.equal(f.calls[0].params.p_id,NOTICE);assert.equal(result.notice.title,'Título corrigido');
  for(const field of ['video_url','target_type','target_ids','read_by','created_by','created_at']) assert.deepEqual(result.notice[field],existing[field]);
});

test('selected audience and intentional video clearing use explicit allowlisted fields',async()=>{
  const f=fixture();
  const result=await f.store.save(input({id:NOTICE,videoUrl:null,targetType:'selected',targetIds:[RECIPIENT]}),{ownerId:OWNER,operation:'update'});
  assert.equal(f.calls[0].params.p_notice.video_url,null);assert.deepEqual(result.notice.target_ids,[RECIPIENT]);
  assert.equal(result.notice.target_type,'selected');
});

test('partial edits preserve nullable legacy read history and an empty all-recipient array',async()=>{
  const legacy=row({read_by:null,target_ids:[],video_url:'https://youtu.be/AbCdEf012_-?si=legacy'});
  const f=fixture(call=>({data:{notice:{...legacy,...call.params.p_notice}},error:null}));
  const result=await f.store.save({id:NOTICE,requestId:REQUEST,message:'Mensagem corrigida'},{ownerId:OWNER,operation:'update'});
  assert.equal(result.notice.read_by,null);assert.deepEqual(result.notice.target_ids,[]);
  assert.equal(result.notice.video_url,legacy.video_url);assert.equal(legacy.message,'Mensagem de teste');
  assert.deepEqual(f.calls[0].params.p_notice,{message:'Mensagem corrigida'});
});

test('partial edits confirm legacy selected recipients/readers with NULL elements without rewriting them',async()=>{
  const legacy=row({target_type:'selected',target_ids:[RECIPIENT,null],read_by:[RECIPIENT,null]});
  const before=structuredClone(legacy);
  const f=fixture(call=>({data:{notice:{...legacy,...call.params.p_notice}},error:null}));
  const result=await f.store.save({id:NOTICE,requestId:REQUEST,title:'Título corrigido'},{ownerId:OWNER,operation:'update'});
  assert.deepEqual(f.calls[0].params.p_notice,{title:'Título corrigido'});
  assert.deepEqual(result.notice.target_ids,[RECIPIENT,null]);assert.deepEqual(result.notice.read_by,[RECIPIENT,null]);
  assert.deepEqual(legacy,before);
});

test('new limits do not reject legacy omitted strings after a different field was successfully saved',async()=>{
  for(const strings of [{title:'x'.repeat(250),message:'m'.repeat(10050)},{title:'',message:' '}]){
    const legacy=row({...strings,target_type:'selected',target_ids:[RECIPIENT,null],read_by:[null],video_url:'https://legacy.invalid/'+ 'x'.repeat(2050)});
    const f=fixture(call=>({data:{notice:{...legacy,...call.params.p_notice}},error:null}));
    const result=await f.store.save({id:NOTICE,requestId:REQUEST,videoUrl:null},{ownerId:OWNER,operation:'update'});
    assert.deepEqual(f.calls[0].params.p_notice,{video_url:null});
    assert.equal(result.notice.title,strings.title);assert.equal(result.notice.message,strings.message);
    assert.deepEqual(result.notice.target_ids,legacy.target_ids);assert.deepEqual(result.notice.read_by,legacy.read_by);
  }
});

test('legacy receipt compatibility never relaxes new inputs or mismatched explicitly edited fields',async()=>{
  const f=fixture();
  for(const patch of [{title:'x'.repeat(201)},{message:'m'.repeat(10001)},{targetType:'selected',targetIds:[RECIPIENT,null]},{readBy:[null]}]){
    await assert.rejects(f.store.save({id:NOTICE,requestId:REQUEST,...patch},{ownerId:OWNER,operation:'update'}),{code:'NOTICE_INPUT'});
  }
  assert.equal(f.calls.length,0);
  for(const receipt of [row({title:'x'.repeat(250)}),row({message:'m'.repeat(10050)}),row({target_type:'selected',target_ids:[RECIPIENT,null]})]){
    const store=fixture(()=>({data:{notice:receipt},error:null})).store;
    await assert.rejects(store.save(input({id:NOTICE,targetType:'selected',targetIds:[RECIPIENT]}),{ownerId:OWNER,operation:'update'}),{code:'UNCONFIRMED_RESULT'});
  }
});

test('YouTube watch, sharing, shorts, embed and live URLs canonicalize safely',()=>{
  for(const url of [`https://www.youtube.com/watch?v=${VIDEO}&ab_channel=Canal&feature=shared`,`https://m.youtube.com/watch?v=${VIDEO}&t=10s`,`https://youtu.be/${VIDEO}?si=share-token`,`https://youtube.com/shorts/${VIDEO}?feature=share`,`https://youtube.com/embed/${VIDEO}?rel=0`,`https://youtube.com/live/${VIDEO}?si=abc`]){
    assert.equal(normalizeNoticeVideoUrl(url),`https://www.youtube.com/watch?v=${VIDEO}`);
  }
  assert.equal(normalizeNoticeVideoUrl(''),null);
  for(const url of [`http://youtube.com/watch?v=${VIDEO}`,`https://youtube.com.evil.invalid/watch?v=${VIDEO}`,`https://user:pass@youtube.com/watch?v=${VIDEO}`,`https://youtube.com:8443/watch?v=${VIDEO}`,`https://youtube.com/watch?v=${VIDEO}&v=${VIDEO}`,`https://youtube.com/watch?v=${VIDEO}&redirect=evil`,`https://youtu.be/${VIDEO}?v=${VIDEO}`,`https://youtube.com/watch?v=${VIDEO}#javascript:evil`,`https://youtube.com/watch?v=%41bCdEf012_-`,'javascript:alert(1)']) assert.throws(()=>normalizeNoticeVideoUrl(url));
});

test('invalid identities, operations, protected fields, audiences and oversized content never issue an RPC',async()=>{
  const f=fixture();
  const badInputs=[input({readBy:[RECIPIENT]}),input({createdBy:'forged'}),input({read_by:[]}),input({created_at:'forged'}),input({message:' '}),input({title:'x'.repeat(201)}),input({message:'x'.repeat(10001)}),input({targetType:'selected',targetIds:[]}),input({targetType:'selected',targetIds:[RECIPIENT,RECIPIENT.toUpperCase()]}),input({targetType:'selected',targetIds:['not-uuid']}),input({targetType:'selected',targetIds:Array(501).fill(RECIPIENT)}),input({targetType:'all',targetIds:[RECIPIENT]}),input({targetType:'unknown'}),input({requestId:'not-uuid'}),input({videoUrl:'https://evil.invalid/video'})];
  for(const value of badInputs) await assert.rejects(f.store.save(value,{ownerId:OWNER}),{code:'NOTICE_INPUT'});
  await assert.rejects(f.store.save(input(),{ownerId:'anonymous'}),{code:'NOTICE_INPUT'});
  await assert.rejects(f.store.save(input({id:NOTICE}),{ownerId:OWNER}),{code:'NOTICE_INPUT'});
  await assert.rejects(f.store.save(input(),{ownerId:OWNER,operation:'delete'}),{code:'NOTICE_INPUT'});
  await assert.rejects(f.store.save(input(),{ownerId:OWNER,operation:'update'}),{code:'NOTICE_INPUT'});
  assert.equal(f.calls.length,0);
});

test('a lost response retries exactly the same request ID and payload without changing the original',async()=>{
  let inserted=0;const journal=new Map();
  const f=fixture((call,count)=>{
    const key=call.params.p_request_id;
    if(!journal.has(key)){inserted++;journal.set(key,row(call.params.p_notice));}
    if(count===1)throw Object.assign(new Error('synthetic lost response'),{code:'NETWORK'});
    return {data:{notice:journal.get(key)},error:null};
  });
  const value=input(),before=structuredClone(value);
  await assert.rejects(f.store.save(value,{ownerId:OWNER}),{code:'NETWORK'});
  assert.equal((await f.store.save(value,{ownerId:OWNER})).notice.id,NOTICE);
  assert.equal(inserted,1);assert.deepEqual(f.calls[0].params,f.calls[1].params);assert.deepEqual(value,before);
});

test('server permission and validation errors are surfaced without false success or input loss',async()=>{
  const error={code:'42501',message:'Permissão de Avisos necessária.'};
  const f=fixture(()=>({data:null,error})),value=input(),before=structuredClone(value);
  await assert.rejects(f.store.save(value,{ownerId:OWNER}),candidate=>candidate===error);
  assert.deepEqual(value,before);assert.equal(f.calls.length,1);
});

test('wrong IDs, changed requested fields, missing rows and malformed receipts cannot be reported as saved',async()=>{
  for(const notice of [null,[],row({id:'wrong-id'}),row({title:'wrong title'}),row({target_ids:[RECIPIENT]}),row({read_by:['not-uuid']}),row({created_at:'bad date'})]){
    const f=fixture(()=>({data:{notice},error:null}));
    await assert.rejects(f.store.save(input(),{ownerId:OWNER}),{code:'UNCONFIRMED_RESULT'});
  }
  const f=fixture(()=>({data:{notice:row({id:OTHER})},error:null}));
  await assert.rejects(f.store.save(input({id:NOTICE}),{ownerId:OWNER,operation:'update'}),{code:'UNCONFIRMED_RESULT'});
});

test('logout immediately cancels the pending result and ignores its later success',async()=>{
  const waiting=deferred(),f=fixture(()=>waiting.promise);
  const pending=f.store.save(input(),{ownerId:OWNER});
  const rejected=assert.rejects(pending,{code:'SESSION_CHANGED'});
  f.store.clear();await rejected;
  assert.equal(f.calls[0].signal.aborted,true);
  waiting.resolve({data:{notice:row()},error:null});await Promise.resolve();
  assert.equal((await f.store.save(input(),{ownerId:OTHER})).notice.id,NOTICE);
});

test('switching owners prevents old permission errors or successes from reaching the new identity',async()=>{
  for(const staleResult of [{data:{notice:row()},error:null},{data:null,error:{code:'42501'}}]){
    const waiting=deferred(),f=fixture((_,count)=>count===1?waiting.promise:({data:{notice:row()},error:null}));
    const old=f.store.save(input(),{ownerId:OWNER});
    const rejected=assert.rejects(old,{code:'SESSION_CHANGED'});
    const current=await f.store.save(input(),{ownerId:OTHER});
    waiting.resolve(staleResult);await rejected;
    assert.equal(current.notice.id,NOTICE);assert.equal(f.calls[0].signal.aborted,true);
  }
});

test('a stalled transport times out and aborts even if it ignores AbortSignal',async()=>{
  const waiting=deferred(),calls=[];
  const store=createNoticePersistence({timeoutMs:5,client:{rpc(){return {abortSignal(signal){calls.push(signal);return waiting.promise;}};}}});
  await assert.rejects(store.save(input(),{ownerId:OWNER}),{code:'TIMEOUT'});
  assert.equal(calls[0].aborted,true);waiting.resolve({data:{notice:row()},error:null});
});

test('partial updates cannot accidentally reset audience or send arbitrary nested objects',()=>{
  assert.deepEqual(buildNoticeCommand({id:NOTICE,requestId:REQUEST,message:'Somente mensagem'},{operation:'update'}).p_notice,{message:'Somente mensagem'});
  assert.throws(()=>buildNoticeCommand({id:NOTICE,requestId:REQUEST,targetIds:[RECIPIENT]},{operation:'update'}));
  assert.throws(()=>buildNoticeCommand(input({title:{toString(){return 'fake';}}})));
  assert.throws(()=>buildNoticeCommand({id:NOTICE,requestId:REQUEST},{operation:'update'}));
});
