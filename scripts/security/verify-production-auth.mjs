// Explicit operator-run integration check. No business rows are written.
// Consumes bootstrap recovery, creates/removes two unlinked Auth test identities,
// revokes test refresh sessions and regenerates the private administrator link.
import assert from 'node:assert/strict';
import { readFile,writeFile,rename } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { bootstrapAdministrator } from './bootstrap-admin.mjs';
const root='security-audit';
const url='https://ucfzkzpmvjekgotexriq.supabase.co';
const keys=JSON.parse(await readFile(`${root}/project-api-keys.private.json`,'utf8'));
const serviceKey=keys.find(k=>k.name==='service_role')?.api_key;
const anonKey=keys.find(k=>k.name==='anon')?.api_key;
if(!serviceKey || !anonKey)throw new Error('Missing operator credentials.');
const config={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const service=createClient(url,serviceKey,config);
const administrator=createClient(url,anonKey,config);
const report={startedAt:new Date().toISOString(),businessWrites:0,checks:[],cleanup:[],blockers:[]};
const testIdentities=[];
let consumedRecovery=false,adminToken;
const check=(name,result)=>{report.checks.push({name,...result});};
const head=(client,table,column='id')=>client.from(table).select(column,{head:true,count:'exact'});
const stateFile=`${root}/bootstrap-admin.private/state.json`;
const linkFile=`${root}/bootstrap-admin.private/configure-access.private.html`;
const state=JSON.parse(await readFile(stateFile,'utf8'));
try{
  const html=await readFile(linkFile,'utf8');
  const actionLink=html.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
  const recovery=new URL(actionLink);
  assert.ok((recovery.origin===url && recovery.pathname==='/auth/v1/verify') ||
    (recovery.origin==='https://www.lalocacao.com.br' && recovery.pathname==='/auth/callback'));
  assert.equal(recovery.searchParams.get('type'),'recovery');
  const tokenHash=recovery.searchParams.get('token_hash') || recovery.searchParams.get('token');
  assert.ok(tokenHash);
  const {data:verified,error:verifyError}=await administrator.auth.verifyOtp({token_hash:tokenHash,type:'recovery'});
  if(verifyError || !verified.session || verified.user?.id!==state.authUserId)throw new Error('RECOVERY_VERIFY_FAILED');
  consumedRecovery=true;adminToken=verified.session.access_token;
  const claims=JSON.parse(Buffer.from(adminToken.split('.')[1],'base64url').toString('utf8'));
  check('recovery_claims',{role:claims.role,aal:claims.aal,amr:claims.amr,expiresAt:claims.exp});
  const {data:validated,error:getUserError}=await administrator.auth.getUser();
  assert.ok(!getUserError && validated.user?.id===state.authUserId);
  check('auth_getUser_verified',{passed:true,emailConfirmed:Boolean(validated.user.email_confirmed_at)});
  const metadata=JSON.parse(await readFile(`${root}/db-metadata.json`,'utf8')).rows[0].security_metadata;
  for(const table of metadata.tables.map(t=>t.table_name)){
    const trusted=await head(service,table);
    const observed=await head(administrator,table);
    const expectedDenied=table==='asaas_payments';
    const passed=expectedDenied?Boolean(observed.error):!trusted.error&&!observed.error&&trusted.count===observed.count;
    check('admin_count_'+table,{passed,serviceCount:trusted.count,adminCount:observed.count,adminStatus:observed.status,expectedDenied});
    if(!passed)report.blockers.push('ADMIN_HEAD_'+table);
  }
  for(const table of ['system_users','investors']){
    const response=await head(administrator,table,'password');
    check('admin_password_column_denied_'+table,{passed:Boolean(response.error),status:response.status,errorCode:response.error?.code});
    if(!response.error)report.blockers.push('PASSWORD_COLUMN_ACCESS_'+table);
  }
  const anonymous=createClient(url,anonKey,config);
  const fleet=await anonymous.rpc('get_public_fleet');
  const expectedFields=new Set(['id','model','year','image','status','weekly_rental','is_favorite','created_at']);
  const projectionSafe=!fleet.error&&Array.isArray(fleet.data)&&fleet.data.every(row=>Object.keys(row).every(field=>expectedFields.has(field)));
  check('anonymous_fleet_projection',{passed:projectionSafe,rows:fleet.data?.length,status:fleet.status});
  if(!projectionSafe)report.blockers.push('PUBLIC_FLEET_PROJECTION');
  for(const label of ['A','B']){
    const password=randomBytes(48).toString('base64url');
    const email=`security-rls-${randomUUID()}@example.invalid`;
    const {data:created,error:createError}=await service.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{security_verification:true}});
    if(createError || !created.user)throw new Error('UNLINKED_IDENTITY_CREATE_FAILED');
    const client=createClient(url,anonKey,config);
    testIdentities.push({id:created.user.id,client});
    const signed=await client.auth.signInWithPassword({email,password});
    if(signed.error || !signed.data.session)throw new Error('UNLINKED_IDENTITY_SIGNIN_FAILED');
    for(const table of ['system_users','investors','vehicles','clients','rentals','transactions','maintenances','service_orders','investor_notices']){
      const response=await head(client,table);
      const passed=!response.error && response.count===0;
      check('unlinked_'+label+'_'+table,{passed,count:response.count,status:response.status});
      if(!passed)report.blockers.push('UNLINKED_'+label+'_'+table);
    }
    const rentals=await client.rpc('get_investor_rentals');
    const passed=!rentals.error&&Array.isArray(rentals.data)&&rentals.data.length===0;
    check('unlinked_'+label+'_rental_rpc',{passed,count:rentals.data?.length,status:rentals.status});
    if(!passed)report.blockers.push('UNLINKED_'+label+'_RENTAL_RPC');
  }
}catch(error){
  // Never serialize provider objects, tokens, links, emails, or raw row values.
  report.blockers.push(['RECOVERY_VERIFY_FAILED','UNLINKED_IDENTITY_CREATE_FAILED','UNLINKED_IDENTITY_SIGNIN_FAILED'].includes(error.message)?error.message:'ASSERTION_OR_REQUEST_FAILED');
}finally{
  const signout=await administrator.auth.signOut({scope:'global'});
  report.cleanup.push({name:'administrator_global_signout',passed:!signout.error});
  if(adminToken){
    const revoked=await administrator.auth.getUser(adminToken);
    report.cleanup.push({name:'getUser_after_signout',rejected:Boolean(revoked.error)});
  }
  for(const item of testIdentities){
    const signout=await item.client.auth.signOut({scope:'global'});
    const deleted=await service.auth.admin.deleteUser(item.id);
    report.cleanup.push({name:'unlinked_identity_cleanup',signoutPassed:!signout.error,deletePassed:!deleted.error});
    if(deleted.error)report.blockers.push('UNLINKED_AUTH_CLEANUP_FAILED');
  }
  if(consumedRecovery){
    try{
      const result=await bootstrapAdministrator({client:service,email:state.email,state,apply:true,refreshLink:true,linkExists:true,
        saveState:async value=>{await writeFile(stateFile+'.tmp',JSON.stringify(value,null,2),{mode:0o600});await rename(stateFile+'.tmp',stateFile);},
        saveLink:async value=>{await writeFile(linkFile,value,{mode:0o600});},
      });
      report.cleanup.push({name:'administrator_recovery_regenerated',passed:result.status==='READY'});
    }catch{report.blockers.push('RECOVERY_REGENERATION_FAILED');}
  }
  report.completedAt=new Date().toISOString();
  await writeFile(`${root}/production-auth-rls-verification.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>c.passed===false).length,blockers:report.blockers,cleanup:report.cleanup,amr:report.checks.find(c=>c.name==='recovery_claims')?.amr}));
}
