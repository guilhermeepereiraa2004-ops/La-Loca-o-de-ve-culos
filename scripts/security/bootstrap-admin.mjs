// Operator-only bootstrap. No email is sent, no old profile/password is reused.
// Default DRY RUN. --apply creates only a NEW approved administrator identity/profile.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PROJECT_URL='https://ucfzkzpmvjekgotexriq.supabase.co';
const CALLBACK='https://www.lalocacao.com.br/auth/callback';
const normalize=email=>String(email || '').trim().toLowerCase();
const likeLiteral=value=>value.replaceAll('\\','\\\\').replaceAll('%','\\%').replaceAll('_','\\_');
const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

async function authUsersForEmail(client,email){
  const matches=[];
  for(let page=1;page<=100;page++){
    const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});
    if(error || !Array.isArray(data?.users))throw new Error('Não foi possível verificar identidades Auth.');
    matches.push(...data.users.filter(user=>normalize(user.email)===email));
    if(data.users.length<1000)return matches;
  }
  throw new Error('Inventário Auth ultrapassa o limite de revisão.');
}

export async function bootstrapAdministrator({client,email,state,apply=false,refreshLink=false,linkExists=false,saveState=async()=>{},saveLink=async()=>{}}){
  email=normalize(email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email de administrador inválido.');
  if(state && (state.projectUrl!==PROJECT_URL || state.email!==email))throw new Error('Journal pertence a outro projeto ou email; não sobrescrever.');
  const journal=state || {version:1,bootstrapId:randomUUID(),profileId:randomUUID(),projectUrl:PROJECT_URL,email,phase:'planned',createdAt:new Date().toISOString()};
  const {data:profiles,error:profileError}=await client.from('system_users').select('id,email,role,auth_user_id').ilike('email',likeLiteral(email));
  const {data:investors,error:investorError}=await client.from('investors').select('id').ilike('email',likeLiteral(email));
  if(profileError || investorError || !Array.isArray(profiles) || !Array.isArray(investors))throw new Error('Pré-checagem de perfis falhou. A migration Auth deve estar aplicada.');
  if(investors.length || profiles.length>1 || (profiles.length && profiles[0].id!==journal.profileId))throw new Error('Email já possui perfil prévio. Bootstrap recusa modificar registros existentes.');
  let matches=await authUsersForEmail(client,email);
  if(matches.length>1)throw new Error('Email Auth duplicado; requer revisão.');
  let identity=matches[0];
  if(identity && identity.app_metadata?.la_security_bootstrap_id!==journal.bootstrapId)throw new Error('Identidade Auth prévia não pertence a este bootstrap. Nada será adotado automaticamente.');
  if(journal.authUserId && identity?.id!==journal.authUserId)throw new Error('Identidade do journal divergiu. Pare e revise.');
  if(profiles.length && (profiles[0].role!=='administrador' || profiles[0].auth_user_id!==identity?.id))throw new Error('Perfil do bootstrap foi alterado; não sobrescrever permissões.');
  const summary={mode:apply?'APPLY':'DRY_RUN',newAuth:!identity,newProfile:profiles.length===0,existingProfilesModified:0,emailSent:false};
  if(!apply)return summary;
  await saveState(journal);
  if(!identity){
    const {data,error}=await client.auth.admin.createUser({email,password:randomBytes(48).toString('base64url'),email_confirm:false,app_metadata:{la_security_bootstrap_id:journal.bootstrapId}});
    if(error || !data?.user)throw new Error('Criação Auth falhou ou é incerta. Preserve o journal; repetir recupera apenas a identidade marcada por este bootstrap.');
    identity=data.user;
  }
  journal.authUserId=identity.id; journal.phase='auth-created'; await saveState(journal);
  if(!profiles.length){
    const {error}=await client.from('system_users').insert({id:journal.profileId,name:'Administrador responsável',email,role:'administrador',modules:[],auth_user_id:identity.id});
    if(error)throw new Error('Perfil novo não pôde ser criado. Identidade Auth preservada para retomar com o mesmo journal.');
  }
  journal.phase='profile-created'; await saveState(journal);
  if(!linkExists || refreshLink){
    const {data,error}=await client.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:CALLBACK}});
    const actionLink=data?.properties?.action_link;
    if(error || !actionLink || data.user?.id!==identity.id)throw new Error('Conta e perfil preservados; não foi possível gerar recuperação. Reexecute com o mesmo journal.');
    const parsed=new URL(actionLink);
    if(parsed.origin!==PROJECT_URL || parsed.pathname!=='/auth/v1/verify')throw new Error('Link de recuperação inesperado. Não liberar.');
    const redirect=parsed.searchParams.get('redirect_to');
    if(redirect!==CALLBACK)throw new Error('Redirect Auth não foi aceito. Configure a allowlist de produção e reexecute com --refresh-link.');
    const tokenHash=data.properties.hashed_token;
    if(!tokenHash || data.properties.verification_type!=='recovery')throw new Error('Prova de recuperação ausente. Não liberar.');
    // Land on the callback BEFORE consuming the token. The callback itself calls
    // verifyOtp(type=recovery); AMR is "otp" even for a genuine recovery session.
    const callbackLink=new URL(CALLBACK);
    callbackLink.searchParams.set('token_hash',tokenHash);
    callbackLink.searchParams.set('type','recovery');
    const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><title>Configurar acesso administrativo</title><h1>Configurar acesso administrativo</h1><p>Arquivo privado: este link dá acesso à conta aprovada. Não compartilhe nem publique. Defina uma senha nova no site. O link é temporário e de uso único.</p><p><a rel="noreferrer" href="${escapeHtml(callbackLink.href)}">Abrir configuração segura da senha</a></p><p>Nenhum email foi enviado. Após concluir, remova este arquivo privado pelo procedimento de limpeza aprovado.</p></html>`;
    await saveLink(html);
    journal.recoveryGeneratedAt=new Date().toISOString();
  }
  journal.phase='ready'; await saveState(journal);
  return {...summary,status:'READY',recoveryLinkWritten:true};
}

async function main(){
  const args=process.argv.slice(2);
  const option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  const allowed=new Set(['--email','--state-dir','--key-file','--apply','--refresh-link']);
  for(let i=0;i<args.length;i++){
    if(!allowed.has(args[i]))throw new Error('Argumento desconhecido.');
    if(!['--apply','--refresh-link'].includes(args[i])){if(!args[i+1] || args[i+1].startsWith('--'))throw new Error('Argumento incompleto.');i++;}
  }
  const email=option('--email'); if(!email)throw new Error('Forneça o email explicitamente aprovado com --email.');
  const directory=resolve(option('--state-dir') || 'security-audit/bootstrap-admin.private');
  const journalFile=join(directory,'state.json'),linkFile=join(directory,'configure-access.private.html');
  let state;try{state=JSON.parse(await readFile(journalFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('Journal ilegível; não sobrescrever.');}
  let key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(option('--key-file')){
    const keys=JSON.parse(await readFile(option('--key-file'),'utf8'));
    key=keys.find(k=>k.name==='service_role')?.api_key;
  }
  if(!key)throw new Error('Credencial de serviço ausente.');
  const url=process.env.SUPABASE_URL || PROJECT_URL;
  if(url!==PROJECT_URL)throw new Error('Projeto divergente.');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let linkExists=false;try{await access(linkFile);linkExists=true;}catch{}
  const saveState=async value=>{
    await mkdir(directory,{recursive:true,mode:0o700});
    const temporary=journalFile+'.tmp';
    await writeFile(temporary,JSON.stringify(value,null,2),{mode:0o600});
    await rename(temporary,journalFile);
  };
  const saveLink=async html=>{await writeFile(linkFile,html,{mode:0o600});};
  const result=await bootstrapAdministrator({client,email,state,apply:args.includes('--apply'),refreshLink:args.includes('--refresh-link'),linkExists,saveState,saveLink});
  console.log(JSON.stringify(result));
  if(args.includes('--apply'))console.log('Arquivo privado de configuração criado no diretório de estado. Não imprimir/publicar o conteúdo.');
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(()=>{console.error('Bootstrap interrompido. Nenhum perfil anterior é alterado. Preserve o journal e revise o estágio registrado antes de repetir. Tokens e detalhes sensíveis não foram registrados.');process.exitCode=1;});
}
