import assert from 'node:assert/strict';
import { bootstrapAdministrator } from './bootstrap-admin.mjs';
const email='approved@example.invalid';
function fixture(){
  const store={system_users:[],investors:[],users:[],creates:0,links:0,journal:undefined,html:null,failProfile:false,failLink:false};
  const client={
    from:table=>({
      select:()=>({ilike:async()=>({data:store[table].filter(row=>row.email?.toLowerCase()===email),error:null})}),
      insert:async payload=>{if(store.failProfile)return {error:{message:'synthetic'}};store[table].push(structuredClone(payload));return {error:null};},
    }),
    auth:{admin:{
      listUsers:async()=>({data:{users:store.users},error:null}),
      createUser:async payload=>{
        assert.equal(payload.email_confirm,false);
        assert.ok(payload.password.length>=48);
        const user={id:'10000000-0000-4000-8000-000000000001',email:payload.email,app_metadata:payload.app_metadata};
        store.users.push(user);store.creates++;return {data:{user},error:null};
      },
      generateLink:async payload=>{
        if(store.failLink)return {data:null,error:{message:'synthetic'}};
        store.links++;
        return {data:{user:store.users[0],properties:{hashed_token:'synthetic-one-time-token',verification_type:'recovery',action_link:'https://ucfzkzpmvjekgotexriq.supabase.co/auth/v1/verify?type=recovery&token=synthetic-one-time-token&redirect_to='+encodeURIComponent(payload.options.redirectTo)}},error:null};
      },
    }},
  };
  const run=options=>bootstrapAdministrator({client,email,state:store.journal,linkExists:Boolean(store.html),saveState:async state=>{store.journal=structuredClone(state);},saveLink:async html=>{store.html=html;},...options});
  return {store,run};
}
let checks=0;
{
  const{store,run}=fixture();const plan=await run({});
  assert.equal(plan.mode,'DRY_RUN');assert.equal(store.creates,0);assert.equal(store.journal,undefined);checks++;
  const result=await run({apply:true});
  assert.equal(result.status,'READY');assert.equal(store.creates,1);assert.equal(store.system_users.length,1);assert.equal(store.system_users[0].role,'administrador');assert.equal('password'in store.system_users[0],false);checks++;
  assert.ok(store.html.includes('https://www.lalocacao.com.br/auth/callback?token_hash=synthetic-one-time-token&amp;type=recovery'));assert.equal(store.journal.phase,'ready');assert.equal(JSON.stringify(store.journal).includes('synthetic-one-time-token'),false);checks++;
  await run({apply:true});assert.equal(store.creates,1);assert.equal(store.system_users.length,1);assert.equal(store.links,1);checks++;
  await run({apply:true,refreshLink:true});assert.equal(store.links,2);checks++;
}
{
  const{store,run}=fixture();store.system_users.push({id:'legacy',email,role:'administrador'});
  await assert.rejects(()=>run({apply:true}),/perfil prévio/);assert.equal(store.creates,0);checks++;
}
{
  const{store,run}=fixture();store.users.push({id:'other',email,app_metadata:{}});
  await assert.rejects(()=>run({apply:true}),/não pertence/);assert.equal(store.creates,0);checks++;
}
{
  const{store,run}=fixture();store.failProfile=true;
  await assert.rejects(()=>run({apply:true}),/Perfil novo/);assert.equal(store.creates,1);assert.equal(store.journal.phase,'auth-created');
  store.failProfile=false;await run({apply:true});assert.equal(store.creates,1);assert.equal(store.system_users.length,1);checks++;
}
{
  const{store,run}=fixture();store.failLink=true;
  await assert.rejects(()=>run({apply:true}),/gerar recuperação/);assert.equal(store.system_users.length,1);
  store.failLink=false;await run({apply:true});assert.equal(store.creates,1);assert.equal(store.system_users.length,1);assert.ok(store.html);checks++;
}
{
  const{store,run}=fixture();await run({apply:true});store.system_users[0].role='funcionario';
  await assert.rejects(()=>run({apply:true}),/não sobrescrever/);assert.equal(store.system_users[0].role,'funcionario');checks++;
}
console.log(`PASS: ${checks} bootstrap scenarios; dry run, new admin, no default password/email, idempotence, foreign profiles/identities refused, recovery from partial failures.`);
