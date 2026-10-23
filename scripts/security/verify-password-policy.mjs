// Operator-approved hosted Auth test only. No business profile/row is created.
import { readFile,writeFile,rename } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { bootstrapAdministrator } from './bootstrap-admin.mjs';
const url='https://ucfzkzpmvjekgotexriq.supabase.co';
const keys=JSON.parse(await readFile('security-audit/project-api-keys.private.json','utf8'));
const config={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,keys.find(k=>k.name==='service_role').api_key,config);
const anon=keys.find(k=>k.name==='anon').api_key;
const recoveryClient=createClient(url,anon,config),passwordClient=createClient(url,anon,config);
const report={startedAt:new Date().toISOString(),businessWrites:0,checks:[],cleanup:[],blockers:[]};
const record=(name,result)=>{report.checks.push({name,...result});if(result.passed===false)report.blockers.push(name);};
let testId;
try{
  const email=`security-recovery-${randomUUID()}@example.invalid`;
  let password=randomBytes(48).toString('base64url');
  const created=await admin.auth.admin.createUser({email,password,email_confirm:false,app_metadata:{security_verification:true}});
  if(created.error || !created.data.user)throw new Error('CREATE_FAILED');
  testId=created.data.user.id;
  const generated=await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:'https://www.lalocacao.com.br/auth/callback'}});
  if(generated.error || !generated.data?.properties?.hashed_token)throw new Error('GENERATE_FAILED');
  const verified=await recoveryClient.auth.verifyOtp({token_hash:generated.data.properties.hashed_token,type:'recovery'});
  if(verified.error || !verified.data.session)throw new Error('VERIFY_FAILED');
  const recoveryClaims=JSON.parse(Buffer.from(verified.data.session.access_token.split('.')[1],'base64url').toString('utf8'));
  record('genuine_recovery_verified',{passed:verified.data.user.id===testId,amr:recoveryClaims.amr,emailConfirmed:Boolean(verified.data.user.email_confirmed_at)});
  const recoveredPassword=randomBytes(48).toString('base64url');
  const updateRecovery=await recoveryClient.auth.updateUser({password:recoveredPassword});
  record('recovery_password_without_current',{passed:!updateRecovery.error,status:updateRecovery.error?.status,errorCode:updateRecovery.error?.code});
  if(!updateRecovery.error)password=recoveredPassword;
  await recoveryClient.auth.signOut({scope:'global'});
  const signin=await passwordClient.auth.signInWithPassword({email,password});
  if(signin.error || !signin.data.session)throw new Error('PASSWORD_SIGNIN_FAILED');
  const passwordClaims=JSON.parse(Buffer.from(signin.data.session.access_token.split('.')[1],'base64url').toString('utf8'));
  record('ordinary_password_signin',{passed:signin.data.user.id===testId,amr:passwordClaims.amr});
  const missingCurrentPassword=randomBytes(48).toString('base64url');
  const missingCurrent=await passwordClient.auth.updateUser({password:missingCurrentPassword});
  record('ordinary_password_without_current_rejected',{passed:Boolean(missingCurrent.error),status:missingCurrent.error?.status,errorCode:missingCurrent.error?.code});
  if(!missingCurrent.error)password=missingCurrentPassword;
  const withCurrent=await passwordClient.auth.updateUser({password:randomBytes(48).toString('base64url'),current_password:password});
  record('ordinary_password_with_current_allowed',{passed:!withCurrent.error,status:withCurrent.error?.status,errorCode:withCurrent.error?.code});
}catch(error){report.blockers.push(['CREATE_FAILED','GENERATE_FAILED','VERIFY_FAILED','PASSWORD_SIGNIN_FAILED'].includes(error.message)?error.message:'REQUEST_FAILED');}
finally{
  for(const client of [recoveryClient,passwordClient]){
    const result=await client.auth.signOut({scope:'global'});report.cleanup.push({name:'test_global_signout',passed:!result.error});
  }
  if(testId){const result=await admin.auth.admin.deleteUser(testId);report.cleanup.push({name:'test_auth_deleted',passed:!result.error});if(result.error)report.blockers.push('TEST_AUTH_CLEANUP_FAILED');}
  try{
    const stateFile='security-audit/bootstrap-admin.private/state.json';
    const state=JSON.parse(await readFile(stateFile,'utf8'));
    const result=await bootstrapAdministrator({client:admin,email:state.email,state,apply:true,refreshLink:true,linkExists:true,
      saveState:async value=>{await writeFile(stateFile+'.tmp',JSON.stringify(value,null,2),{mode:0o600});await rename(stateFile+'.tmp',stateFile);},
      saveLink:async value=>writeFile('security-audit/bootstrap-admin.private/configure-access.private.html',value,{mode:0o600}),
    });
    report.cleanup.push({name:'admin_direct_callback_link_regenerated',passed:result.status==='READY'});
  }catch{report.blockers.push('ADMIN_LINK_REGENERATION_FAILED');}
  report.completedAt=new Date().toISOString();
  await writeFile('security-audit/production-password-policy-verification.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
