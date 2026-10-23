import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSecurityUsersHandler } from '../api/security-users.js';

const ACTOR_AUTH='10000000-0000-4000-8000-000000000001';
const TARGET_AUTH='10000000-0000-4000-8000-000000000002';
const OTHER_AUTH='10000000-0000-4000-8000-000000000003';
const ACTOR_PROFILE='20000000-0000-4000-8000-000000000001';
const TARGET_PROFILE='20000000-0000-4000-8000-000000000002';
const CURRENT_PASSWORD='synthetic-current-password';
const clone=value=>structuredClone(value);

// Stateful Supabase transport: predicates and projections are honored; writes
// persist across real handler calls. Nothing connects to the network/production.
function fixture({linked=true,actorRole='administrador',reauthAs=ACTOR_AUTH,aal='aal1',factors=[]}={}){
  const store={
    tables:{system_users:[
      {id:ACTOR_PROFILE,auth_user_id:ACTOR_AUTH,name:'Synthetic admin',email:'admin@example.invalid',role:actorRole,modules:[]},
      {id:TARGET_PROFILE,auth_user_id:linked?TARGET_AUTH:null,name:'Synthetic target',email:'target@example.invalid',role:'funcionario',modules:['frota']},
    ],investors:[]},
    auth:new Map([[ACTOR_AUTH,{id:ACTOR_AUTH,email:'admin@example.invalid',password:CURRENT_PASSWORD,factors:clone(factors),email_confirmed_at:'2026-10-23'}]]),
    calls:[],emails:0,failNextProfileSave:false,failGenerateLink:false,onCreateAuth:null,failAuthUpdate:false,onAuthUpdate:null,
  };
  if(linked)store.auth.set(TARGET_AUTH,{id:TARGET_AUTH,email:'target@example.invalid',password:'synthetic-previous-target-password',factors:[],email_confirmed_at:'2026-10-23'});
  const select=(row,fields)=>!row?null:fields==='*'?clone(row):Object.fromEntries(fields.split(',').filter(field=>Object.hasOwn(row,field)).map(field=>[field,clone(row[field])]));
  const tableQuery=table=>{
    let operation='select',fields='*',payload,executed;
    const predicates=[];
    const execute=()=>{
      if(executed)return executed;
      const selected=store.tables[table].filter(row=>predicates.every(predicate=>predicate(row)));
      store.calls.push({table,operation,matched:selected.length});
      if(['insert','update'].includes(operation)&&store.failNextProfileSave){store.failNextProfileSave=false;return executed={data:null,error:{code:'23505'}};}
      let result=selected;
      if(operation==='insert'){
        const entries=(Array.isArray(payload)?payload:[payload]).map(value=>({id:randomUUID(),...clone(value)}));
        for(const row of entries)assert.equal(Object.hasOwn(row,'password'),false,'public profile must never store any password');
        store.tables[table].push(...entries);result=entries;
      }else if(operation==='update'){
        assert.equal(Object.hasOwn(payload,'password'),false,'public profile must never store any password');
        selected.forEach(row=>Object.assign(row,clone(payload)));
      }else if(operation==='delete')store.tables[table]=store.tables[table].filter(row=>!selected.includes(row));
      return executed={data:result.map(row=>select(row,fields)),error:null};
    };
    const single=async nullable=>{
      const result=execute();if(result.error)return result;
      if(result.data.length===0&&nullable)return {data:null,error:null};
      return result.data.length===1?{data:result.data[0],error:null}:{data:null,error:{code:'PGRST116'}};
    };
    const chain={
      select(value='*'){fields=value;return chain;},
      eq(column,value){
        // PostgREST accepts PostgreSQL array literals in equality filters.
        // The handler only permits module enum values without commas/braces.
        predicates.push(row=>Array.isArray(row[column])&&typeof value==='string'&&value.startsWith('{')
          ? JSON.stringify(row[column])===JSON.stringify(value.slice(1,-1)?value.slice(1,-1).split(','):[])
          : row[column]===value);return chain;
      },
      is(column,value){predicates.push(row=>value===null?row[column]==null:row[column]===value);return chain;},
      insert(value){operation='insert';payload=value;return chain;},
      update(value){operation='update';payload=value;return chain;},
      delete(){operation='delete';return chain;},
      maybeSingle:()=>single(true),single:()=>single(false),then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject);},
    };
    return chain;
  };
  const auth={
    getUser:async()=>({data:{user:clone(store.auth.get(ACTOR_AUTH))},error:null}),
    getClaims:async()=>({data:{claims:{sub:ACTOR_AUTH,aal}},error:null}),
    signInWithPassword:async input=>{
      store.calls.push({operation:'reauth'});
      return input.email==='admin@example.invalid'&&input.password===CURRENT_PASSWORD?{data:{user:{id:reauthAs}},error:null}:{data:{user:null},error:{code:'invalid_credentials'}};
    },
    signOut:async()=>({error:null}),
  };
  const privileged={
    from:tableQuery,rpc:async()=>({data:true,error:null}),
    auth:{admin:{
      createUser:async attributes=>{
        if([...store.auth.values()].some(user=>user.email.toLowerCase()===attributes.email.toLowerCase()))return {data:{user:null},error:{code:'email_exists'}};
        const user={id:randomUUID(),...clone(attributes),email_confirmed_at:attributes.email_confirm?'2026-10-23':null,factors:[]};
        store.auth.set(user.id,user);store.calls.push({operation:'create-auth',id:user.id});
        if(store.onCreateAuth)store.onCreateAuth(user);
        return {data:{user:clone(user)},error:null};
      },
      getUserById:async id=>({data:{user:clone(store.auth.get(id))},error:store.auth.has(id)?null:{code:'user_not_found'}}),
      updateUserById:async(id,attributes)=>{
        const user=store.auth.get(id);if(!user)return {data:null,error:{code:'user_not_found'}};
        store.calls.push({operation:'update-auth',id});
        if(store.onAuthUpdate)store.onAuthUpdate(id,clone(attributes));
        if(store.failAuthUpdate)return {data:null,error:{code:'synthetic_auth_write_error'}};
        Object.assign(user,clone(attributes));return {data:{user:clone(user)},error:null};
      },
      deleteUser:async id=>{store.auth.delete(id);store.calls.push({operation:'delete-auth',id});return {error:null};},
      generateLink:async attributes=>{
        store.calls.push({operation:'generate-link',type:attributes.type});
        const user=[...store.auth.values()].find(item=>item.email.toLowerCase()===attributes.email.toLowerCase());
        if(store.failGenerateLink||!user)return {data:null,error:{code:'synthetic_link_error'}};
        return {data:{user:clone(user),properties:{hashed_token:'synthetic-opaque-activation-token'}},error:null};
      },
      inviteUserByEmail:async()=>{store.emails++;throw new Error('Tests forbid email delivery');},
    }},
  };
  const handler=createSecurityUsersHandler({
    environment:{SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-server',AUTH_REDIRECT_URL:'https://app.example.invalid/auth/callback'},
    clientFactory:(_url,key)=>key==='synthetic-server'?privileged:{auth},
  });
  const request=async body=>{
    const response={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.statusCode=code;return this;},json(value){this.body=value;return this;}};
    await handler({method:'POST',headers:{host:'app.example.invalid',origin:'https://app.example.invalid','content-type':'application/json',authorization:'Bearer synthetic-token'},body},response);
    return response;
  };
  const target=()=>store.tables.system_users.find(row=>row.id===TARGET_PROFILE);
  return {store,request,target};
}
const action=(kind,operation,profile)=>({kind,action:operation,currentPassword:CURRENT_PASSWORD,profile});
const staff=(overrides={})=>({name:'Synthetic new member',email:'new@example.invalid',password:'synthetic-new-password',role:'funcionario',modules:['frota'],...overrides});

test('stateful admin create/update persists one identity, stable profile ID and allowlisted response',async()=>{
  const f=fixture();const created=await f.request(action('system','create',staff()));
  assert.equal(created.statusCode,200);
  const profile=f.store.tables.system_users.find(row=>row.email==='new@example.invalid');
  assert.ok(profile.id&&profile.auth_user_id);assert.equal(Object.hasOwn(profile,'password'),false);
  assert.equal(f.store.auth.get(profile.auth_user_id).password,'synthetic-new-password');
  const updated=await f.request(action('system','update',staff({id:profile.id,email:'changed@example.invalid',role:'gerente',modules:['logs']})));
  assert.equal(updated.statusCode,200);assert.equal(updated.body.profile.id,profile.id);assert.equal(updated.body.profile.auth_user_id,profile.auth_user_id);
  assert.equal(f.store.auth.get(profile.auth_user_id).email,'changed@example.invalid');
  assert.equal(profile.role,'gerente');assert.deepEqual(profile.modules,['logs']);
  assert.equal(JSON.stringify(updated.body).includes('synthetic-new-password'),false);
  assert.equal(JSON.stringify(updated.body).includes(CURRENT_PASSWORD),false);
});

test('IDOR across account kind and forged protected identity fields never mutate another table',async()=>{
  const f=fixture();const before=clone(f.store.tables);
  const confused=await f.request(action('investor','activation-link',{id:TARGET_PROFILE}));
  assert.equal(confused.statusCode,404);
  const forged=await f.request(action('system','update',staff({id:TARGET_PROFILE,auth_user_id:OTHER_AUTH})));
  assert.equal(forged.statusCode,400);assert.deepEqual(f.store.tables,before);
  assert.equal(f.store.calls.some(call=>['create-auth','update-auth','generate-link'].includes(call.operation)),false);
});

test('non-admin cannot use valid target ID or requested admin role to bypass actor authorization',async()=>{
  const f=fixture({actorRole:'funcionario'});const before=clone(f.store.tables);
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,role:'administrador'})));
  assert.equal(response.statusCode,403);assert.deepEqual(f.store.tables,before);
  assert.equal(f.store.calls.some(call=>call.operation==='reauth'),false);
});

test('step-up identity mismatch fails before any privileged account change',async()=>{
  const f=fixture({reauthAs:OTHER_AUTH});const before=clone(f.store.tables);
  const response=await f.request(action('system','create',staff()));
  assert.equal(response.statusCode,403);assert.deepEqual(f.store.tables,before);assert.equal(f.store.auth.size,2);
});

test('self-account activation/deletion is refused using Auth ID, not confusing the distinct profile ID',async()=>{
  for(const operation of ['activation-link','delete']){
    const f=fixture();const response=await f.request(action('system',operation,{id:ACTOR_PROFILE}));
    assert.equal(response.statusCode,409);assert.equal(f.store.auth.has(ACTOR_AUTH),true);assert.equal(f.store.tables.system_users.length,2);
  }
});

test('legacy activation link failure preserves original profile and retry reuses its single new identity',async()=>{
  const f=fixture({linked:false});const original=clone(f.target());f.store.failGenerateLink=true;
  const failed=await f.request(action('system','activation-link',{id:TARGET_PROFILE}));
  assert.equal(failed.statusCode,503);assert.equal(f.target().id,original.id);assert.equal(f.target().role,original.role);assert.deepEqual(f.target().modules,original.modules);
  const linkedId=f.target().auth_user_id;assert.ok(linkedId);assert.equal(f.store.auth.get(linkedId).email_confirm,false);
  const secret=f.store.auth.get(linkedId).password;assert.ok(secret.length>=48);assert.equal(JSON.stringify(failed.body).includes(secret),false);
  f.store.failGenerateLink=false;
  const retry=await f.request(action('system','activation-link',{id:TARGET_PROFILE}));
  assert.equal(retry.statusCode,200);assert.equal(f.target().auth_user_id,linkedId);assert.equal(f.store.auth.size,2);
  assert.equal(f.store.calls.filter(call=>call.operation==='create-auth').length,1);
  assert.equal(new URL(retry.body.activationLink).searchParams.get('type'),'recovery');assert.equal(f.store.emails,0);
});

test('concurrent legacy binding cannot be overwritten, and partial Auth creation is reported for review',async()=>{
  const f=fixture({linked:false});f.store.onCreateAuth=()=>{f.target().auth_user_id=OTHER_AUTH;};
  const response=await f.request(action('system','activation-link',{id:TARGET_PROFILE}));
  assert.equal(response.statusCode,409);assert.equal(f.target().auth_user_id,OTHER_AUTH);assert.equal(f.target().id,TARGET_PROFILE);
  assert.equal(f.store.calls.some(call=>call.operation==='generate-link'),false);
  assert.equal(f.store.auth.size,2,'new unlinked identity is preserved for operator review, never destructive auto rollback');
});

test('new profile save failure removes only its newly created Auth identity',async()=>{
  const f=fixture();f.store.failNextProfileSave=true;
  const response=await f.request(action('system','create',staff()));
  assert.equal(response.statusCode,409);assert.equal(f.store.auth.size,2);assert.equal(f.store.tables.system_users.length,2);
  assert.equal(f.store.auth.has(ACTOR_AUTH),true);assert.equal(f.store.auth.has(TARGET_AUTH),true);
  assert.equal(f.store.calls.filter(call=>call.operation==='delete-auth').length,1);
});

test('profile save failure leaves existing Auth credentials and identity untouched',async()=>{
  const f=fixture();const original=clone(f.target());f.store.failNextProfileSave=true;
  const previousAuth=clone(f.store.auth.get(TARGET_AUTH));
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,email:'new-target@example.invalid'})));
  assert.equal(response.statusCode,409);assert.deepEqual(f.target(),original);assert.equal(f.store.auth.has(TARGET_AUTH),true);
  assert.deepEqual(f.store.auth.get(TARGET_AUTH),previousAuth);
  const activation=await f.request(action('system','activation-link',{id:TARGET_PROFILE}));
  assert.equal(activation.statusCode,200);
  assert.equal(f.store.calls.some(call=>['update-auth','delete-auth'].includes(call.operation)),false);
});

test('Auth failure compensates persisted profile and preserves prior identity and credentials',async()=>{
  const f=fixture();const original=clone(f.target());const previousAuth=clone(f.store.auth.get(TARGET_AUTH));
  f.store.failAuthUpdate=true;
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,email:'changed@example.invalid',role:'gerente',modules:['logs','frota']})));
  assert.equal(response.statusCode,409);assert.match(response.body.error,/restaurado/);
  assert.deepEqual(f.target(),original);assert.deepEqual(f.store.auth.get(TARGET_AUTH),previousAuth);
  assert.equal(f.store.calls.filter(call=>call.table==='system_users'&&call.operation==='update').length,2);
  assert.equal(f.store.calls.some(call=>call.operation==='delete-auth'),false);
});

test('compensation refuses to overwrite a concurrent module change and requires explicit reconciliation',async()=>{
  const f=fixture();f.store.failAuthUpdate=true;
  f.store.onAuthUpdate=()=>{f.target().modules=['clientes'];};
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,email:'changed@example.invalid',modules:['logs']})));
  assert.equal(response.statusCode,503);assert.match(response.body.error,/revisão administrativa/);
  assert.deepEqual(f.target().modules,['clientes'],'concurrent authorization edit must survive compensation');
  assert.equal(f.target().email,'changed@example.invalid');
  assert.equal(f.store.auth.get(TARGET_AUTH).email,'target@example.invalid');
  assert.equal(f.target().auth_user_id,TARGET_AUTH);
});

test('compensation refuses to overwrite a concurrent identity binding',async()=>{
  const f=fixture();f.store.failAuthUpdate=true;
  f.store.onAuthUpdate=()=>{f.target().auth_user_id=OTHER_AUTH;};
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,email:'changed@example.invalid'})));
  assert.equal(response.statusCode,503);assert.equal(f.target().auth_user_id,OTHER_AUTH);
  assert.equal(f.store.auth.get(TARGET_AUTH).email,'target@example.invalid');
  assert.equal(f.store.calls.some(call=>call.operation==='delete-auth'),false);
});

test('profile-only edit persists permissions while skipping Auth completely',async()=>{
  const f=fixture();const previousAuth=clone(f.store.auth.get(TARGET_AUTH));
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,email:'target@example.invalid',password:undefined,role:'gerente',modules:['logs']})));
  assert.equal(response.statusCode,200);assert.equal(f.target().role,'gerente');assert.deepEqual(f.target().modules,['logs']);
  assert.deepEqual(f.store.auth.get(TARGET_AUTH),previousAuth);
  assert.equal(f.store.calls.some(call=>call.operation==='update-auth'),false);
});

test('verified MFA requires original bearer AAL2 before reauthentication or privileged mutation',async()=>{
  const f=fixture({factors:[{id:'synthetic-factor',status:'verified'}]});const before=clone(f.store.tables);
  const response=await f.request(action('system','create',staff()));
  assert.equal(response.statusCode,403);assert.match(response.body.error,/autenticador/);
  assert.deepEqual(f.store.tables,before);assert.equal(f.store.auth.size,2);
  assert.equal(f.store.calls.some(call=>call.operation==='reauth'),false);
});

test('verified MFA with AAL2 permits normal persisted account workflow',async()=>{
  const f=fixture({aal:'aal2',factors:[{id:'synthetic-factor',status:'verified'}]});
  const response=await f.request(action('system','create',staff()));
  assert.equal(response.statusCode,200);assert.equal(f.store.tables.system_users.length,3);assert.equal(f.store.auth.size,3);
  assert.equal(f.store.calls.filter(call=>call.operation==='reauth').length,1);
});

test('conflicting target staff/investor identity is rejected before updating either Auth or profile',async()=>{
  const f=fixture();f.store.tables.investors.push({id:randomUUID(),auth_user_id:TARGET_AUTH,email:'target@example.invalid'});
  const before=clone(f.store.tables);
  const response=await f.request(action('system','update',staff({id:TARGET_PROFILE,role:'administrador'})));
  assert.equal(response.statusCode,409);assert.deepEqual(f.store.tables,before);
  assert.equal(f.store.calls.some(call=>call.operation==='update-auth'),false);
});
