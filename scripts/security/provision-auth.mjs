// Operator-only identity linking. Dry run by default. Never imports legacy passwords.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (never VITE_*).
// node scripts/security/provision-auth.mjs --manifest <private-reviewed.json> [--apply]
// Manifest: [{"table":"system_users","record_id":"uuid","email":"verified@example.invalid","auth_user_id":"uuid"}]
// Or create_auth_user:true instead of auth_user_id: creates UNCONFIRMED user with
// an unrecoverable random password, sends no email. Finish verified recovery in Auth.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const argv=process.argv.slice(2);
const manifestFlag=argv.indexOf('--manifest');
const apply=argv.includes('--apply');
const fail = message => { console.error(message); process.exitCode=1; };
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const normalizeEmail=email=>String(email || '').trim().toLowerCase();

try {
  if(manifestFlag<0 || !argv[manifestFlag+1]) throw new Error('Forneça --manifest com um JSON privado revisado. Sem alterações.');
  if(argv.some((arg,index)=>!['--manifest','--apply'].includes(arg) && index!==manifestFlag+1)) throw new Error('Argumento desconhecido. Sem alterações.');
  const manifest=JSON.parse(await readFile(argv[manifestFlag+1],'utf8'));
  if(!Array.isArray(manifest) || manifest.length<1 || manifest.length>1000) throw new Error('Manifesto inválido.');
  const seen=new Set(); const authSeen=new Set(); const emails=new Set();
  for(const entry of manifest) {
    const allowed=['table','record_id','email','auth_user_id','create_auth_user'];
    if(Object.keys(entry).some(k=>!allowed.includes(k)) || !['system_users','investors'].includes(entry.table) ||
      !uuid.test(entry.record_id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email || '') ||
      (!uuid.test(entry.auth_user_id || '') && entry.create_auth_user!==true) ||
      (entry.auth_user_id && entry.create_auth_user===true)) throw new Error('Entrada inválida no manifesto; nenhum campo de senha é aceito.');
    const recordKey=`${entry.table}:${entry.record_id}`;
    const email=normalizeEmail(entry.email);
    if(seen.has(recordKey) || emails.has(email) || (entry.auth_user_id && authSeen.has(entry.auth_user_id))) throw new Error('Manifesto contém identidade duplicada.');
    seen.add(recordKey); emails.add(email); if(entry.auth_user_id) authSeen.add(entry.auth_user_id);
  }
  const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do operador.');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const plans=[];
  // Complete read-only preflight before the first write.
  for(const entry of manifest) {
    const {data:profile,error}=await client.from(entry.table).select('id,email,auth_user_id').eq('id',entry.record_id).single();
    if(error || !profile || normalizeEmail(profile.email)!==normalizeEmail(entry.email)) throw new Error('Perfil inexistente ou email divergente. Revise o manifesto em canal privado.');
    if(profile.auth_user_id && profile.auth_user_id!==entry.auth_user_id) throw new Error('Perfil já vinculado; recusa sobrescrever identidade.');
    if(entry.auth_user_id) {
      const {data,error:authError}=await client.auth.admin.getUserById(entry.auth_user_id);
      if(authError || !data.user || normalizeEmail(data.user.email)!==normalizeEmail(entry.email) || !data.user.email_confirmed_at) throw new Error('Conta Auth existente não confirmada ou identidade divergente.');
      // One Auth identity must not acquire both staff and investor roles.
      const other=entry.table==='system_users'?'investors':'system_users';
      const {count,error:otherError}=await client.from(other).select('id',{count:'exact',head:true}).eq('auth_user_id',entry.auth_user_id);
      if(otherError || count!==0) throw new Error('Identidade já vinculada a outro tipo de perfil.');
    }
    plans.push({...entry,alreadyLinked:profile.auth_user_id===entry.auth_user_id && Boolean(entry.auth_user_id)});
  }
  console.log(JSON.stringify({mode:apply?'APPLY':'DRY_RUN',profiles:plans.length,alreadyLinked:plans.filter(p=>p.alreadyLinked).length,newUnconfirmedAccounts:plans.filter(p=>p.create_auth_user).length}));
  if(!apply) console.log('Pré-checagem concluída. Nenhuma conta criada, email enviado ou vínculo alterado.');
  else {
    let linked=0;
    for(const plan of plans) {
      if(plan.alreadyLinked) continue;
      let authId=plan.auth_user_id;
      if(plan.create_auth_user) {
        const {data,error}=await client.auth.admin.createUser({email:normalizeEmail(plan.email),password:randomBytes(48).toString('base64url'),email_confirm:false});
        if(error || !data.user) throw new Error('Falha ao criar conta Auth. As contas já criadas foram preservadas; confira antes de repetir.');
        authId=data.user.id;
      }
      const {data,error}=await client.from(plan.table).update({auth_user_id:authId}).eq('id',plan.record_id).is('auth_user_id',null).select('id');
      if(error || data?.length!==1) throw new Error('Falha no vínculo. Não há rollback destrutivo; confira contas Auth não vinculadas antes de repetir.');
      linked+=1;
    }
    console.log(JSON.stringify({linked,status:'Contas novas continuam não confirmadas. Conclua a verificação de identidade e recuperação pelo Supabase Auth antes de liberar acesso.'}));
  }
} catch(error) {
  // Never serialize provider errors or raw input (may contain PII/secrets).
  const safeMessages=['Forneça ','Argumento ','Manifesto ','Entrada ','Defina ','Perfil ','Conta Auth ','Identidade ','Falha '];
  fail(safeMessages.some(prefix=>error.message?.startsWith(prefix))?error.message:'Falha no provisionamento; detalhes sensíveis não foram registrados.');
}
