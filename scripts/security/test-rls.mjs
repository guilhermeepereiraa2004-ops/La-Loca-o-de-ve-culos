// Real PostgreSQL semantics through PGlite; synthetic fixtures, no network/production.
// npm install --prefix <temporary-dir> --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.11
// PGLITE_MODULE_PATH=<temporary-dir>/node_modules/@electric-sql/pglite/dist/index.js node scripts/security/test-rls.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.PGLITE_MODULE_PATH
  ? pathToFileURL(process.env.PGLITE_MODULE_PATH).href : '@electric-sql/pglite';
const { PGlite } = await import(moduleName);
const db = new PGlite();
const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  employee: '10000000-0000-4000-8000-000000000002',
  investorA: '10000000-0000-4000-8000-000000000003',
  investorB: '10000000-0000-4000-8000-000000000004',
  unknown: '10000000-0000-4000-8000-000000000005',
  inactive: '10000000-0000-4000-8000-000000000006',
  logsOnly: '10000000-0000-4000-8000-000000000007',
  vehicleA: '20000000-0000-4000-8000-000000000001',
  vehicleB: '20000000-0000-4000-8000-000000000002',
};
let checks = 0;
const pass = () => { checks += 1; };
async function count(sql, expected) {
  assert.equal((await db.query(sql)).rows.length, expected, sql);
  pass();
}
async function denied(sql) {
  await assert.rejects(() => db.query(sql), e => ['42501'].includes(e.code), sql);
  pass();
}
async function as(role, uid, test) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']);
  let primaryError;
  try { await test(); } catch(error) { primaryError=error;throw error; }
  finally { try { await db.exec('reset role'); } catch(error) { if(!primaryError)throw error; } }
}
async function equal(sql, expected) {
  assert.deepEqual((await db.query(sql)).rows, expected, sql);
  pass();
}
async function isolated(test) {
  await db.exec('begin');
  try { await test(); } finally { await db.exec('rollback'); }
}
async function deniedInTransaction(sql) {
  await db.exec('savepoint expected_denial');
  try { await denied(sql); } finally { await db.exec('rollback to savepoint expected_denial'); }
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions; create schema storage;
    create table auth.users(id uuid primary key);
    create table auth.mfa_factors(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),status text not null);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    grant execute on function auth.jwt() to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create policy old_open_storage on storage.objects for all using(true) with check(true);
    grant all on storage.objects to anon,authenticated,service_role;
    insert into storage.buckets values('La-locacao','La-locacao',true,null,null);
    create sequence public.system_logs_id_seq;
  `);
  if (process.env.SECURITY_SCHEMA_METADATA_FILE) {
    // Optional read-only production CATALOG snapshot. Contains no user rows.
    // Reconstruct types/PKs/FKs only; synthetic defaults replace server defaults.
    const snapshot=JSON.parse(await readFile(process.env.SECURITY_SCHEMA_METADATA_FILE,'utf8')).rows[0].schema_snapshot;
    const quote=identifier=>'"'+String(identifier).replaceAll('"','""')+'"';
    const types=new Set(['uuid','text','numeric(10,2)','date','timestamp with time zone','jsonb','boolean','numeric','integer','uuid[]','bigint','text[]','time without time zone']);
    const tables=Map.groupBy(snapshot.columns,c=>c.table_name);
    for (const [name,columns] of tables) {
      const definitions=columns.map(c=>{
        if(!types.has(c.type)) throw new Error('Unsupported catalog type; review test bootstrap.');
        const fixtureDefault=c.column_name==='id' && c.type==='uuid'?' default gen_random_uuid()':
          c.column_name==='created_at' && c.type==='timestamp with time zone'?' default now()':'';
        return `${quote(c.column_name)} ${c.type}${fixtureDefault}${c.is_nullable==='NO'?' not null':''}`;
      });
      await db.exec(`create table public.${quote(name)} (${definitions.join(',')})`);
    }
    for (const constraint of snapshot.constraints) {
      if(!['p','u','f','c'].includes(constraint.contype)) continue;
      const name=constraint.table_name.replace(/^public\./,'');
      await db.exec(`alter table public.${quote(name)} add constraint ${quote(constraint.conname)} ${constraint.definition}`);
    }
  } else {
    const baseline = await readFile('supabase/migrations/20260528135229_remote_schema.sql','utf8');
    for (const sql of baseline.match(/CREATE TABLE IF NOT EXISTS[\s\S]*?\n\);/g) || []) {
      await db.exec(sql.replaceAll('"extensions"."uuid_generate_v4"()', 'gen_random_uuid()'));
    }
    // Structural constraints only: no production seed/dump or historical data migrations.
    for (const sql of baseline.match(/ALTER TABLE ONLY[\s\S]*?ADD CONSTRAINT[\s\S]*?;/g) || []) {
      await db.exec(sql);
    }
    for (const name of ['20260813131752_add_oil_changes_table.sql','20260813133609_add_investor_notices_table.sql']) {
      await db.exec(await readFile(`supabase/migrations/${name}`,'utf8'));
    }
  }
  await db.exec(`
    grant all on all tables in schema public to anon,authenticated;
    grant select(password) on public.system_users to anon;
    create view public.leaked_profiles as select id,password from public.system_users;
    grant select on public.leaked_profiles to anon,authenticated;
    create function public.legacy_unsafe_rpc() returns text language sql security definer as $$ select 'synthetic'::text $$;
    create table public.unknown_backup(id uuid,password text);
    grant all on public.unknown_backup to anon,authenticated;
    create policy unknown_open on public.unknown_backup for all using(true) with check(true);
  `);
  // Exercise emergency containment separately, then full migration over it.
  await db.exec(await readFile('security-audit/CONTENCAO.sql','utf8'));
  await as('anon',null,async () => {
    await denied('select password from public.system_users');
    await denied('select * from public.leaked_profiles');
    await denied('select public.legacy_unsafe_rpc()');
    await count("select * from storage.objects where bucket_id='La-locacao'",0);
  });
  await db.exec(await readFile('supabase/migrations/20261023162033_security_auth_rls_containment.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261023181455_conditional_mfa_enforcement.sql','utf8'));
  const unchangedPoliciesSql=`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
    where policyname not in ('staff_insert','staff_update','staff_delete') order by schemaname,tablename,policyname`;
  const policiesBefore=(await db.query(unchangedPoliciesSql)).rows;
  const profileGrantsSql=`select table_name,column_name,privilege_type,grantee from information_schema.column_privileges
    where table_schema='public' and table_name in ('system_users','investors') order by table_name,column_name,privilege_type,grantee`;
  const profileGrantsBefore=(await db.query(profileGrantsSql)).rows;
  const readonlyMigration=await readFile('supabase/migrations/20261023184650_staff_readonly_business_writes.sql','utf8');
  await db.exec(readonlyMigration);
  // Applying again must also be safe, without changing investor/SELECT policies.
  await db.exec(readonlyMigration);
  await equal(unchangedPoliciesSql,policiesBefore);
  await equal(profileGrantsSql,profileGrantsBefore);
  await equal(`select count(*)::integer as unsafe from pg_policies where schemaname='public'
    and policyname in ('staff_insert','staff_update','staff_delete')
    and (coalesce(qual,'')||coalesce(with_check,'')) not like '%allow_admin_write%'`,[{unsafe:0}]);
  await db.exec(`
    insert into auth.users values ${Object.values(ids).slice(0,7).map(id => `('${id}')`).join(',')};
    insert into public.system_users(id,name,email,role,password,modules,auth_user_id) values
      ('${ids.admin}','Admin','admin@example.invalid','administrador','synthetic-legacy-secret','{}','${ids.admin}'),
      ('${ids.employee}','Employee','employee@example.invalid','funcionario','synthetic-legacy-secret','{frota}','${ids.employee}'),
      ('${ids.logsOnly}','Logs only','logs@example.invalid','funcionario','synthetic-legacy-secret','{logs}','${ids.logsOnly}');
    insert into public.investors(id,name,email,password,status,auth_user_id) values
      ('${ids.investorA}','A','a@example.invalid','synthetic-legacy-secret','Ativo','${ids.investorA}'),
      ('${ids.investorB}','B','b@example.invalid','synthetic-legacy-secret','Ativo','${ids.investorB}'),
      ('${ids.inactive}','Inactive','inactive@example.invalid','synthetic-legacy-secret','Inativo','${ids.inactive}');
    insert into public.vehicles(id,model,plate,investor_id,status,image) values
      ('${ids.vehicleA}','Vehicle A','AAA0001','${ids.investorA}','Disponível','https://synthetic.invalid/storage/v1/object/public/La-locacao/secret.pdf'),
      ('${ids.vehicleB}','Vehicle B','BBB0002','${ids.investorB}','Disponível','https://ucfzkzpmvjekgotexriq.supabase.co/storage/v1/object/public/vehicle-public-images/car.png');
    insert into public.transactions(type,val,cat,date,vehicle_plate) values
      ('in',100,'Aluguel','2026-10-01','AAA0001'),('in',200,'Aluguel','2026-10-01','BBB0002'),('out',50,'Other','2026-10-01',null);
    insert into public.rentals(id_veiculo,start_date,value,user_name,cnh_number) values
      ('${ids.vehicleA}','2026-10-01',100,'Synthetic private driver A','synthetic-cnh-a'),
      ('${ids.vehicleB}','2026-10-01',200,'Synthetic private driver B','synthetic-cnh-b');
    insert into public.clients(nome) values('Synthetic private client');
    insert into public.investor_notices(id,title,message,target_type,target_ids) values
      ('30000000-0000-4000-8000-000000000001','All','Notice','all',null),
      ('30000000-0000-4000-8000-000000000002','A','Notice','specific',array['${ids.investorA}']::uuid[]),
      ('30000000-0000-4000-8000-000000000003','B','Notice','specific',array['${ids.investorB}']::uuid[]);
    insert into storage.objects(bucket_id,name) values ('La-locacao','veiculos/private.pdf'),
      ('La-locacao','condutores/private.pdf'),('La-locacao','unknown/private.pdf');
  `);
  await as('anon',null,async () => {
    for (const table of ['system_users','investors','vehicles','clients','rentals','transactions','unknown_backup','leaked_profiles']) {
      await denied(`select * from public.${table}`);
    }
    await denied('select public.legacy_unsafe_rpc()');
    await denied("select public.consume_security_rate_limit('test',2,300)");
    await denied('select * from public.get_investor_rentals()');
    const fleet=(await db.query('select * from public.get_public_fleet()')).rows;
    assert.equal(fleet.length,2); pass();
    assert.equal(fleet.find(v=>v.id===ids.vehicleA).image,null); pass();
    assert.equal('plate' in fleet[0],false); pass();
    await denied("insert into storage.objects(bucket_id,name) values('La-locacao','attack.html')");
    await count("select * from storage.objects where bucket_id='La-locacao'",0);
  });
  await as('authenticated',ids.investorA,async () => {
    await count('select * from public.vehicles',1);
    await count('select * from public.transactions',1);
    await count('select id from public.investors',1);
    await count('select id from public.system_users',0);
    await count('select * from public.clients',0);
    await count('select * from public.rentals',0);
    const rentals=(await db.query('select * from public.get_investor_rentals()')).rows;
    assert.equal(rentals.length,1); assert.equal(rentals[0].id_veiculo,ids.vehicleA); pass();
    assert.equal('cnh_number' in rentals[0],false); pass();
    await denied('select password from public.investors');
    await denied('select password from public.system_users');
    await denied("update public.system_users set role='administrador'");
    await denied(`update public.investors set auth_user_id='${ids.admin}'`);
    await denied(`insert into public.transactions(type,val,date,vehicle_plate) values('in',9,'2026-10-01','BBB0002')`);
    await count('select * from public.investor_notices',2);
    await db.query("select public.mark_investor_notice_read('30000000-0000-4000-8000-000000000001')");
    await db.query("select public.mark_investor_notice_read('30000000-0000-4000-8000-000000000003')");
    const notice=(await db.query("select read_by from public.investor_notices where id='30000000-0000-4000-8000-000000000001'")).rows[0];
    assert.deepEqual(notice.read_by,[ids.investorA]); pass();
    await db.query("update public.investor_notices set title='forged'");
    const unchanged=(await db.query("select title from public.investor_notices where id='30000000-0000-4000-8000-000000000001'")).rows[0];
    assert.equal(unchanged.title,'All'); pass();
    await count("select * from storage.objects where bucket_id='La-locacao'",0);
    await denied("insert into storage.objects(bucket_id,name) values('La-locacao','attack.pdf')");
  });
  await as('authenticated',ids.investorB,async () => {
    const tx=(await db.query('select vehicle_plate from public.transactions')).rows;
    assert.deepEqual(tx,[{vehicle_plate:'BBB0002'}]); pass();
    const rentals=(await db.query('select * from public.get_investor_rentals()')).rows;
    assert.equal(rentals[0].id_veiculo,ids.vehicleB); pass();
  });
  for (const uid of [ids.unknown,ids.inactive]) await as('authenticated',uid,async () => {
    await count('select * from public.vehicles',0);
    await count('select * from public.transactions',0);
    await count('select * from public.get_investor_rentals()',0);
  });
  await as('authenticated',ids.employee,async () => {
    await count('select * from public.vehicles',2);
    await count('select id from public.system_users',1);
    await count('select * from public.clients',0);
    await count('select * from public.transactions',0);
    await denied("update public.system_users set modules='{financeiro}'");
    await denied("insert into storage.objects(bucket_id,name) values('La-locacao','attack.svg')");
    await count("select * from storage.objects where bucket_id='La-locacao'",1);
  });
  await as('authenticated',ids.admin,async () => {
    await count('select * from public.vehicles',2);
    await count('select * from public.transactions',3);
    await count('select * from public.clients',1);
    await count('select id from public.system_users',3);
    await denied('select password from public.system_users');
    await denied('select password from public.investors');
    await denied("update public.system_users set role='administrador'");
    await denied("insert into storage.objects(bucket_id,name) values('vehicle-public-images','attack.html')");
    await count("select * from storage.objects where bucket_id='La-locacao'",3);
  });
  await as('authenticated',ids.logsOnly,async () => {
    await count("select * from storage.objects where bucket_id='La-locacao'",0);
  });
  await as('service_role',null,async () => {
    for (const expected of [true,true,false]) {
      const result=await db.query("select public.consume_security_rate_limit('upload:synthetic',2,300) as allowed");
      assert.equal(result.rows[0].allowed,expected); pass();
    }
  });
  // Behavioral integration checks below persist/re-read mutations in real
  // PostgreSQL and roll them back; no application implementation is mocked.
  const addedVehicle='40000000-0000-4000-8000-000000000001';
  await as('authenticated',ids.admin,()=>isolated(async()=>{
    await equal(`insert into public.vehicles(id,model,plate,image,investor_id) values('${addedVehicle}','Synthetic CRUD','CRUD001','storage://La-locacao/veiculos/roundtrip.png','${ids.investorA}') returning id`,[{id:addedVehicle}]);
    await equal(`select image,model from public.vehicles where id='${addedVehicle}'`,[{image:'storage://La-locacao/veiculos/roundtrip.png',model:'Synthetic CRUD'}]);
    await equal(`update public.vehicles set km=12345,model='Synthetic updated' where id='${addedVehicle}' returning id`,[{id:addedVehicle}]);
    await equal(`select km,model,image from public.vehicles where id='${addedVehicle}'`,[{km:'12345',model:'Synthetic updated',image:'storage://La-locacao/veiculos/roundtrip.png'}]);
    await equal(`delete from public.vehicles where id='${addedVehicle}' returning id`,[{id:addedVehicle}]);
    await count(`select * from public.vehicles where id='${addedVehicle}'`,0);
  }));
  await count(`select * from public.vehicles where id='${addedVehicle}'`,0);
  await equal('select count(*)::integer as count,sum(val)::numeric as total from public.transactions',[{count:3,total:'350'}]);

  // UI promises staff read-only. Even with every relevant module, both roles
  // must be denied direct business mutations while retaining authorized reads.
  for(const role of ['funcionario','gerente'])await isolated(async()=>{
    await db.exec(`update public.system_users set role='${role}',modules='{frota,clientes,locacao,financeiro}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await equal('select private_security.allow_admin_write() as allowed',[{allowed:false}]);
      for(const [table,expected,insert,update] of [
        ['vehicles',2,"insert into public.vehicles(model,plate) values('Readonly bypass','READ001')","update public.vehicles set km=999 returning id"],
        ['clients',1,"insert into public.clients(nome) values('Readonly bypass')","update public.clients set nome='Readonly bypass' returning id"],
        ['rentals',2,`insert into public.rentals(id_veiculo,start_date,value) values('${ids.vehicleA}','2026-10-23',1)`,"update public.rentals set value=999 returning id"],
        ['transactions',3,"insert into public.transactions(type,val,date) values('in',1,'2026-10-23')","update public.transactions set val=999 returning id"],
      ]){
        await count(`select * from public.${table}`,expected);
        await deniedInTransaction(insert);
        await equal(update,[]);
        await equal(`delete from public.${table} returning id`,[]);
      }
      // User-controlled claims never replace the protected database role.
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:'authenticated',aal:'aal2',user_metadata:{role:'administrador'}})]);
      await deniedInTransaction("insert into public.vehicles(model,plate) values('Forged admin','READ002')");
    });
  });
  await count('select * from public.vehicles',2);
  await count('select * from public.clients',1);
  await count('select * from public.rentals',2);
  await equal('select count(*)::integer as count,sum(val)::numeric as total from public.transactions',[{count:3,total:'350'}]);

  // A/B may read their own records, but neither may mutate even their own rows.
  for(const [uid,ownPlate,foreignPlate] of [[ids.investorA,'AAA0001','BBB0002'],[ids.investorB,'BBB0002','AAA0001']]){
    await as('authenticated',uid,()=>isolated(async()=>{
      await equal(`select vehicle_plate from public.transactions where vehicle_plate='${foreignPlate}'`,[]);
      await equal(`select plate from public.vehicles where plate='${foreignPlate}'`,[]);
      for(const plate of [ownPlate,foreignPlate]){
        await equal(`update public.transactions set val=9999 where vehicle_plate='${plate}' returning id`,[]);
        await equal(`delete from public.transactions where vehicle_plate='${plate}' returning id`,[]);
        await equal(`update public.vehicles set investor_id='${ids.inactive}' where plate='${plate}' returning id`,[]);
        await equal(`delete from public.vehicles where plate='${plate}' returning id`,[]);
        await deniedInTransaction(`insert into public.transactions(type,val,date,vehicle_plate) values('in',5,'2026-10-23','${plate}')`);
      }
      await deniedInTransaction(`insert into public.vehicles(model,plate,investor_id) values('Forged owner','FORGED1','${uid}')`);
      await deniedInTransaction(`insert into public.rentals(id_veiculo,start_date,value) values('${ids.vehicleA}','2026-10-23',1)`);
      await deniedInTransaction(`update public.investors set email='attacker@example.invalid',status='Ativo' where id='${uid}'`);
    }));
  }
  await equal('select count(*)::integer as count,sum(val)::numeric as total from public.transactions',[{count:3,total:'350'}]);
  await equal(`select investor_id from public.vehicles where id='${ids.vehicleA}'`,[{investor_id:ids.investorA}]);

  // Authenticated JWT role/user_metadata alone grants no company membership.
  await as('authenticated',null,async()=>{
    await count('select * from public.vehicles',0);
    await count('select * from public.transactions',0);
    await denied("insert into public.vehicles(model,plate) values('No identity','NOAUTH1')");
  });
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role:'authenticated',user_metadata:{role:'administrador',modules:['frota','financeiro']}})]);
      await count('select * from public.vehicles',0);
      await deniedInTransaction("insert into public.vehicles(model,plate) values('Forged metadata','METAFRG')");
      await deniedInTransaction(`update public.system_users set role='administrador',modules='{financeiro}' where id='${ids.employee}'`);
    });
  });
  await as('authenticated',ids.employee,()=>count('select * from public.vehicles',2));

  // Administrator rental write, re-read and rollback preserve stored documents.
  const addedRental='40000000-0000-4000-8000-000000000002';
  await isolated(async()=>{
    await as('authenticated',ids.admin,async()=>{
      await equal(`insert into public.rentals(id,id_veiculo,start_date,value,documentos) values('${addedRental}','${ids.vehicleA}','2026-10-23',400,'{"cnh":"storage://La-locacao/condutores/fixture/cnh.pdf","signedContract":"storage://La-locacao/contratos/fixture.pdf"}'::jsonb) returning id`,[{id:addedRental}]);
      await db.exec(`update public.rentals set value=450 where id='${addedRental}'`);
      await equal(`select value,documentos from public.rentals where id='${addedRental}'`,[{value:'450',documentos:{cnh:'storage://La-locacao/condutores/fixture/cnh.pdf',signedContract:'storage://La-locacao/contratos/fixture.pdf'}}]);
      await equal(`delete from public.rentals where id='${addedRental}' returning id`,[{id:addedRental}]);
    });
  });
  await count(`select * from public.rentals where id='${addedRental}'`,0);

  // Ownership predicates differ across UUID, exact plate, and legacy text IDs.
  // Exercise real linked rows so an empty table cannot make an IDOR test pass.
  await isolated(async()=>{
    await db.exec(`
      insert into public.maintenances(vehicle_plate,service_type) values('AAA0001','Synthetic A'),('BBB0002','Synthetic B');
      insert into public.oil_changes(vehicle_plate,date) values('AAA0001','2026-10-23'),('BBB0002','2026-10-23');
      insert into public.service_orders(vehicle_id,date,plate) values('${ids.vehicleA}','2026-10-23','AAA0001'),('${ids.vehicleB}','2026-10-23','BBB0002');
      insert into public.replacement_contracts(main_vehicle_plate,replacement_vehicle_plate) values('AAA0001','BBB0002'),('BBB0002','AAA0001');
      insert into public.investor_payouts(investor_id,investor_name,amount,reference_month) values('${ids.investorA}','Synthetic A',10,'2026-10'),('${ids.investorB}','Synthetic B',20,'2026-10');
      insert into public.inspections(vehicle_plate,driver_name,date) values('AAA0001','Synthetic restricted driver','2026-10-23');
    `);
    for(const [uid,ownPlate,otherPlate,ownVehicle] of [[ids.investorA,'AAA0001','BBB0002',ids.vehicleA],[ids.investorB,'BBB0002','AAA0001',ids.vehicleB]]){
      await as('authenticated',uid,async()=>{
        await equal('select vehicle_plate from public.maintenances',[{vehicle_plate:ownPlate}]);
        await equal('select vehicle_plate from public.oil_changes',[{vehicle_plate:ownPlate}]);
        await equal('select vehicle_id from public.service_orders',[{vehicle_id:ownVehicle}]);
        await equal('select main_vehicle_plate from public.replacement_contracts',[{main_vehicle_plate:ownPlate}]);
        await equal('select investor_id from public.investor_payouts',[{investor_id:uid}]);
        await count('select * from public.inspections',0);
        await equal(`update public.maintenances set vehicle_plate='${ownPlate}' where vehicle_plate='${otherPlate}' returning id`,[]);
        await equal('delete from public.investor_payouts returning id',[]);
      });
    }
  });

  await isolated(async()=>{
    const fallbackRental='40000000-0000-4000-8000-000000000003';
    const conflictingRental='40000000-0000-4000-8000-000000000004';
    await db.exec(`insert into public.rentals(id,id_veiculo,"id_do_veículo",vehicle_plate,start_date,value,cnh_number) values
      ('${fallbackRental}',null,'${ids.vehicleA}','BBB0002','2026-10-23',5,'synthetic-hidden'),
      ('${conflictingRental}','${ids.vehicleB}','${ids.vehicleA}','AAA0001','2026-10-23',7,'synthetic-hidden')`);
    await as('authenticated',ids.investorA,async()=>{
      const result=await db.query('select * from public.get_investor_rentals()');
      assert.equal(result.rows.length,2);pass();
      assert.equal(result.rows.some(row=>row.id===fallbackRental),true);pass();
      assert.equal(result.rows.some(row=>row.id===conflictingRental),false);pass();
      assert.equal(result.rows.every(row=>row.id_veiculo===ids.vehicleA&&!Object.hasOwn(row,'cnh_number')),true);pass();
    });
    await as('authenticated',ids.investorB,async()=>{
      const result=await db.query('select * from public.get_investor_rentals()');
      assert.equal(result.rows.length,2);pass();
      assert.equal(result.rows.some(row=>row.id===conflictingRental),true);pass();
      assert.equal(result.rows.some(row=>row.id===fallbackRental),false);pass();
    });
  });

  // A real server-side ownership transfer immediately changes RLS, independently
  // of a client's old snapshot or editable JWT metadata.
  await isolated(async()=>{
    await as('authenticated',ids.admin,async()=>{
      await equal(`update public.vehicles set investor_id='${ids.investorB}' where id='${ids.vehicleA}' returning id`,[{id:ids.vehicleA}]);
    });
    await as('authenticated',ids.investorA,async()=>{
      await count('select * from public.vehicles',0);
      await count('select * from public.transactions',0);
      await count('select * from public.get_investor_rentals()',0);
    });
    await as('authenticated',ids.investorB,async()=>{
      await count('select * from public.vehicles',2);
      await count('select * from public.transactions',2);
      await count('select * from public.get_investor_rentals()',2);
    });
  });
  await equal(`select investor_id from public.vehicles where id='${ids.vehicleA}'`,[{investor_id:ids.investorA}]);

  // Protected profile fields remain server-only even for a legitimate admin.
  for(const uid of [ids.employee,ids.admin,ids.investorA])await as('authenticated',uid,()=>isolated(async()=>{
    for(const mutation of [
      "insert into public.system_users(name,email,role) values('Forged','forged@example.invalid','administrador')",
      `update public.system_users set auth_user_id='${ids.unknown}' where id='${ids.employee}'`,
      `update public.system_users set password='synthetic-forged' where id='${ids.admin}'`,
      `delete from public.investors where id='${ids.investorB}'`,
    ])await deniedInTransaction(mutation);
  }));

  // Notice acknowledgement is idempotent and cannot acknowledge another target.
  await isolated(async()=>{
    await as('authenticated',ids.investorA,async()=>{
      for(let times=0;times<2;times++)await db.query("select public.mark_investor_notice_read('30000000-0000-4000-8000-000000000002')");
      await db.query("select public.mark_investor_notice_read('30000000-0000-4000-8000-000000000003')");
    });
    await equal("select read_by from public.investor_notices where id='30000000-0000-4000-8000-000000000002'",[{read_by:[ids.investorA]}]);
    await equal("select coalesce(read_by,'{}'::uuid[]) as read_by from public.investor_notices where id='30000000-0000-4000-8000-000000000003'",[{read_by:[]}]);
  });

  // Read-only staff can append their own audit event; this is deliberately
  // distinct from a business write. Even administrators cannot rewrite logs.
  for(const role of ['funcionario','gerente'])await isolated(async()=>{
    await db.exec(`update public.system_users set role='${role}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await db.exec("insert into public.system_logs(id,user_name,user_email,action,description) values(9001,'Synthetic employee','employee@example.invalid','Create','Synthetic audit')");
      pass();
      await deniedInTransaction("insert into public.system_logs(id,user_name,user_email,action,description) values(9002,'Forged actor','admin@example.invalid','Create','Forged audit')");
      await count('select * from public.system_logs',0);
    });
    await as('authenticated',ids.logsOnly,()=>equal('select user_email from public.system_logs where id=9001',[{user_email:'employee@example.invalid'}]));
    await as('authenticated',ids.admin,async()=>{
      await deniedInTransaction("update public.system_logs set description='rewrite' where id=9001");
      await deniedInTransaction('delete from public.system_logs where id=9001');
    });
  });
  await count('select * from public.system_logs where id=9001',0);

  for(const uid of [ids.admin,ids.employee,ids.investorA])await as('authenticated',uid,()=>isolated(async()=>{
    await equal("update storage.objects set name='overwritten' where bucket_id='La-locacao' returning name",[]);
    await equal("delete from storage.objects where bucket_id='La-locacao' returning name",[]);
    await deniedInTransaction("update storage.buckets set public=true where id='La-locacao'");
  }));
  await count("select * from storage.objects where bucket_id='La-locacao'",3);
  await equal("select public from storage.buckets where id='La-locacao'",[{public:false}]);

  // The MFA migration is exercised locally, without enrolling any real
  // user's factor or changing production. Unverified enrollment cannot lock out.
  await isolated(async()=>{
    const aal=async(uid,level,test)=>as('authenticated',uid,async()=>{
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role:'authenticated',aal:level})]);
      await test();
    });
    await aal(ids.admin,'aal1',()=>count('select * from public.vehicles',2));
    await db.exec(`insert into auth.mfa_factors(user_id,status) values('${ids.admin}','unverified')`);
    await aal(ids.admin,'aal1',async()=>{
      await equal('select private_security.mfa_satisfied() as allowed',[{allowed:true}]);
      await count('select * from public.vehicles',2);
    });
    await db.exec(`update auth.mfa_factors set status='verified' where user_id='${ids.admin}'`);
    await aal(ids.admin,'aal1',async()=>{
      await equal('select private_security.is_admin() as allowed',[{allowed:false}]);
      await count('select * from public.vehicles',0);
      await count('select id from public.investors',0);
      await count('select id from public.system_users',1);
      await count("select * from storage.objects where bucket_id='La-locacao'",0);
      await equal('update public.vehicles set km=999 returning id',[]);
      await deniedInTransaction("insert into public.vehicles(model,plate) values('MFA bypass','MFA0001')");
      // Client-editable metadata cannot manufacture signed MFA assurance.
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:ids.admin,role:'authenticated',aal:'aal1',user_metadata:{aal:'aal2',role:'administrador'}})]);
      await count('select * from public.vehicles',0);
    });
    await aal(ids.admin,'aal2',async()=>{
      await equal('select private_security.is_admin() as allowed',[{allowed:true}]);
      await count('select * from public.vehicles',2);
      await count('select id from public.system_users',3);
      await count("select * from storage.objects where bucket_id='La-locacao'",3);
      await deniedInTransaction('select password from public.system_users');
      await equal(`update public.vehicles set km=555 where id='${ids.vehicleA}' returning id`,[{id:ids.vehicleA}]);
      await equal(`select km from public.vehicles where id='${ids.vehicleA}'`,[{km:'555'}]);
    });
    await db.exec(`insert into auth.mfa_factors(user_id,status) values('${ids.employee}','verified')`);
    await aal(ids.employee,'aal1',async()=>{
      await count('select * from public.vehicles',0);
      await count('select id from public.system_users',1);
    });
    await aal(ids.employee,'aal2',async()=>{
      await count('select * from public.vehicles',2);
      await equal(`update public.vehicles set km=999 where id='${ids.vehicleA}' returning id`,[]);
      await equal(`select km from public.vehicles where id='${ids.vehicleA}'`,[{km:'555'}]);
      await deniedInTransaction("insert into public.vehicles(model,plate) values('Readonly MFA bypass','READ003')");
      await count('select * from public.clients',0);
    });
  });
  await equal(`select km from public.vehicles where id='${ids.vehicleA}'`,[{km:null}]);

  // The owner subsequently authorized create/edit by assigned owning module.
  // Apply that change only after exercising the historical read-only cutover.
  const moduleOperationsMigration=await readFile('supabase/migrations/20261023195959_staff_module_writes_atomic_rentals.sql','utf8');
  await db.exec(moduleOperationsMigration);
  // A review/recovery replay must not duplicate triggers or broaden privileges.
  await db.exec(moduleOperationsMigration);
  await equal(unchangedPoliciesSql,policiesBefore);
  await equal(profileGrantsSql,profileGrantsBefore);
  const callCreate=async(requestId,rental,client,paymentDay=null)=>(await db.query(
    'select public.create_rental_atomic($1,$2::jsonb,$3::jsonb,$4) as result',
    [requestId,JSON.stringify(rental),JSON.stringify(client),paymentDay])).rows[0].result;
  const callUpdate=async(requestId,rentalId,rental,client)=>(await db.query(
    'select public.update_rental_atomic($1,$2,$3::jsonb,$4::jsonb) as result',
    [requestId,rentalId,JSON.stringify(rental),JSON.stringify(client)])).rows[0].result;
  const callDeposit=async(requestId,rentalId,installment,value)=>(await db.query(
    'select public.pay_rental_deposit($1,$2,$3,$4) as result',[requestId,rentalId,installment,value])).rows[0].result;
  const callMaintenance=async(requestId,maintenanceId,maintenance)=>(await db.query(
    'select public.save_maintenance_atomic($1,$2,$3::jsonb) as result',[requestId,maintenanceId,JSON.stringify(maintenance)])).rows[0].result;
  const callStatus=async(vehicleId,status)=>(await db.query(
    'select public.set_operational_vehicle_status($1,$2) as result',[vehicleId,status])).rows[0].result;
  const rejectsAtomic=async(run,codes)=>{
    await db.exec('savepoint atomic_denial');
    try{await assert.rejects(run,error=>codes.includes(error.code));pass();}
    finally{await db.exec('rollback to savepoint atomic_denial');}
  };
  const rentalSnapshot=async()=>(await db.query(`select jsonb_build_object(
    'rentals',(select jsonb_agg(to_jsonb(r) order by id) from public.rentals r),
    'clients',(select jsonb_agg(to_jsonb(c) order by id) from public.clients c),
    'transactions',(select jsonb_agg(to_jsonb(t) order by id) from public.transactions t),
    'vehicles',(select jsonb_agg(to_jsonb(v) order by id) from public.vehicles v),
    'maintenances',(select jsonb_agg(to_jsonb(m) order by id) from public.maintenances m),
    'requests',(select count(*) from private_security.rental_requests)) as snapshot`)).rows[0].snapshot;
  const newVehicle='50000000-0000-4000-8000-000000000001';
  const nextVehicle='50000000-0000-4000-8000-000000000002';
  const requestId='60000000-0000-4000-8000-000000000001';
  const signed='storage://La-locacao/condutores/fixture/signed.pdf';
  const baseRental={id_veiculo:newVehicle,start_date:'2026-10-19',value:700,user_name:'Synthetic atomic driver',tipo:'weekly',
    imposto_de_pneus:25,deposit_installments:3,'total do depósito':300,'caução_paga':0,
    documentos:{cnh:'storage://La-locacao/condutores/fixture/cnh.pdf',customMeta:{retained:true}},contrato_assinado:signed};
  const baseClient={nome:'Synthetic atomic driver',cpf:'synthetic-atomic-cpf',cnh_number:'synthetic-atomic-cnh',
    documentos:{residence:'storage://La-locacao/condutores/fixture/residence.pdf'}};
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status,admin_tax) values
      ('${newVehicle}','Atomic vehicle','ATOM001','Disponível',20),('${nextVehicle}','Atomic next','ATOM002','Disponível',0)`);
    await db.exec(`update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    let created;
    await as('authenticated',ids.employee,async()=>{
      await deniedInTransaction("insert into public.transactions(type,val,date) values('in',1,'2026-10-23')");
      await deniedInTransaction("insert into public.clients(nome) values('RPC dependency bypass')");
      await equal(`update public.vehicles set model='Dependency bypass' where id='${newVehicle}' returning id`,[]);
      await deniedInTransaction(`insert into public.rentals(id_veiculo,start_date,value) values('${newVehicle}','2026-10-19',1)`);
      created=await callCreate(requestId,baseRental,baseClient,5);
      assert.ok(created.rental.id&&created.client.id);pass();
      assert.equal(created.rental.id_cliente,created.client.id);pass();
      assert.equal(created.vehicle.status,'Alugado');pass();
      assert.equal(created.rental.contrato_assinado,signed);pass();
      assert.deepEqual(created.transactions.map(row=>[row.cat,row.val]).sort(),[['Aluguel',400],['Taxa Adm',80],['taxa de pneus',25]].sort());pass();
      await count('select * from public.transactions',0);
      const replay=await callCreate(requestId,baseRental,baseClient,5);
      assert.equal(replay.rental.id,created.rental.id);pass();
      assert.deepEqual(replay.transactions.map(row=>row.id),created.transactions.map(row=>row.id));pass();
      await rejectsAtomic(()=>callCreate(requestId,{...baseRental,value:701},baseClient,5),['22023']);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000002',{...baseRental,role:'administrador'},baseClient),['22023']);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000003',{...baseRental,value:-1},baseClient),['22023']);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000004',{...baseRental,documentos:{signedContract:'https://attacker.invalid/doc.pdf'}},baseClient),['22023']);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000005',{...baseRental,start_date:'2026-02-31'},baseClient),['22007','22008']);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000006',baseRental,baseClient),['23505']);
      await equal(`delete from public.rentals where id='${created.rental.id}' returning id`,[]);
      const changed=await callUpdate('60000000-0000-4000-8000-000000000007',created.rental.id,
        {id_veiculo:nextVehicle,value:800,documentos:{extraNote:'preserved extras',signedContract:signed}},
        {nome:baseClient.nome,documentos:{extraClient:'preserved client'}});
      assert.equal(changed.rental.id,created.rental.id);pass();
      assert.equal(changed.client.id,created.client.id);pass();
      assert.equal(changed.rental.documentos.cnh,baseRental.documentos.cnh);pass();
      assert.deepEqual(changed.rental.documentos.customMeta,{retained:true});pass();
      assert.equal(changed.client.documentos.residence,baseClient.documentos.residence);pass();
      assert.equal(changed.transactions.length,0);pass();
      assert.equal(changed.previous_vehicle.id,newVehicle);pass();
      assert.equal(changed.previous_vehicle.status,'Disponível');pass();
      const editReplay=await callUpdate('60000000-0000-4000-8000-000000000007',created.rental.id,
        {id_veiculo:nextVehicle,value:800,documentos:{extraNote:'preserved extras',signedContract:signed}},
        {nome:baseClient.nome,documentos:{extraClient:'preserved client'}});
      assert.equal(editReplay.previous_vehicle.id,newVehicle);pass();
      await rejectsAtomic(()=>callUpdate('60000000-0000-4000-8000-000000000020',created.rental.id,{'caução_paga':301},{}),['22023']);
      await count(`select * from public.rentals where id='${created.rental.id}'`,1);
    });
    await equal(`select status from public.vehicles where id='${newVehicle}'`,[{status:'Disponível'}]);
    await equal(`select status from public.vehicles where id='${nextVehicle}'`,[{status:'Alugado'}]);
    await equal(`select count(*)::integer as count from public.transactions`,[{count:6}]);
    await db.exec(`update public.system_users set modules='{faturamento}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await equal(`update public.rentals set value=999 where id='${created.rental.id}' returning id`,[]);
      await rejectsAtomic(()=>callCreate('60000000-0000-4000-8000-000000000008',baseRental,baseClient),['42501']);
      const paid=await callDeposit('60000000-0000-4000-8000-000000000009',created.rental.id,1,100);
      assert.equal(paid.rental['caução_paga'],100);pass();
      assert.deepEqual(paid.rental.documentos.paidInstallments,[1]);pass();
      assert.equal(paid.rental.documentos.cnh,baseRental.documentos.cnh);pass();
      const repeated=await callDeposit('60000000-0000-4000-8000-000000000009',created.rental.id,1,100);
      assert.equal(repeated.rental['caução_paga'],100);pass();
      const extraRequest=await callDeposit('60000000-0000-4000-8000-000000000010',created.rental.id,1,100);
      assert.equal(extraRequest.rental['caução_paga'],100);pass();
      await rejectsAtomic(()=>callDeposit('60000000-0000-4000-8000-000000000009',created.rental.id,2,100),['22023']);
      await rejectsAtomic(()=>callDeposit('60000000-0000-4000-8000-000000000011',created.rental.id,4,100),['22023']);
      await rejectsAtomic(()=>callDeposit('60000000-0000-4000-8000-000000000012',created.rental.id,2,201),['22023']);
    });
    await as('authenticated',ids.investorA,async()=>{
      await rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient,5),['42501']);
      await rejectsAtomic(()=>callUpdate(requestId,created.rental.id,{},{}),['42501']);
      await rejectsAtomic(()=>callDeposit(requestId,created.rental.id,1,100),['42501']);
      await deniedInTransaction('select * from private_security.rental_requests');
    });
  });

  // A failure after rental/client INSERT must roll back every business side effect.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status) values('${newVehicle}','Rollback vehicle','ROLL001','Disponível');
      update public.system_users set modules='{locacao}' where id='${ids.employee}';
      create function private_security.test_transaction_failure() returns trigger language plpgsql as $$begin raise exception using errcode='23514',message='Synthetic transaction failure';end$$;
      create trigger synthetic_transaction_failure before insert on public.transactions for each row execute function private_security.test_transaction_failure();`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient,5),['23514']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });

  // Owning write modules are narrower than reading dependencies; delete stays admin.
  for(const role of ['funcionario','gerente'])await isolated(async()=>{
    await db.exec(`update public.system_users set role='${role}',modules='{frota}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await equal(`insert into public.vehicles(id,model,plate) values('${newVehicle}','Owned write','OWNED01') returning id`,[{id:newVehicle}]);
      await equal(`update public.vehicles set km=321 where id='${newVehicle}' returning id`,[{id:newVehicle}]);
      await equal(`select km from public.vehicles where id='${newVehicle}'`,[{km:'321'}]);
      await equal(`delete from public.vehicles where id='${newVehicle}' returning id`,[]);
      await deniedInTransaction("insert into public.clients(nome) values('Wrong owning module')");
      await deniedInTransaction("insert into public.transactions(type,val,date) values('in',1,'2026-10-23')");
      await rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient),['42501']);
      await deniedInTransaction('select password from public.system_users');
      await deniedInTransaction("update public.system_users set modules='{locacao}'");
    });
    await db.exec(`update public.system_users set modules='{vistoria}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await count('select * from public.vehicles',3);
      await equal(`update public.vehicles set model='Read dependency is not owner' returning id`,[]);
      await deniedInTransaction("insert into public.vehicles(model,plate) values('Read dependency','READ004')");
    });
  });

  // Billing owns financial writes, but may change only a fine's settled status.
  await isolated(async()=>{
    await db.exec(`insert into public.system_fines(id,value,status,vehicle_plate) values('atomic-fine',100,'Pendente','AAA0001');
      update public.system_users set modules='{faturamento}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await equal("insert into public.transactions(type,val,date,cat) values('in',10,'2026-10-23','Aluguel') returning cat",[{cat:'Aluguel'}]);
      await equal("update public.system_fines set status='Pago' where id='atomic-fine' returning status",[{status:'Pago'}]);
      await deniedInTransaction("update public.system_fines set status='Pago',value=1 where id='atomic-fine'");
      await deniedInTransaction("update public.system_fines set status='Pendente' where id='atomic-fine'");
      await deniedInTransaction("insert into public.system_fines(id,value) values('forged-billing-fine',1)");
      await equal("delete from public.system_fines where id='atomic-fine' returning id",[]);
      await equal('update public.rentals set value=1 returning id',[]);
    });
    await db.exec(`update public.system_users set modules='{multas}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,()=>equal("update public.system_fines set value=90,status='Pendente' where id='atomic-fine' returning status",[{status:'Pendente'}]));
  });
  await isolated(async()=>{
    await db.exec(`insert into public.system_fines(id,value,status,vehicle_plate,installments,paid_installments)
      values('installment-fine',300,'Pendente','AAA0001',3,'[]');
      update public.system_users set modules='{faturamento}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await deniedInTransaction(`update public.system_fines set status='Pago' where id='installment-fine'`);
      await deniedInTransaction(`update public.system_fines set status='Em Cobrança',paid_installments='[1,2]' where id='installment-fine'`);
      await equal(`update public.system_fines set status='Em Cobrança',paid_installments='[1]' where id='installment-fine' returning paid_installments`,[{paid_installments:[1]}]);
      await deniedInTransaction(`update public.system_fines set paid_installments='[]' where id='installment-fine'`);
      await deniedInTransaction(`update public.system_fines set paid_installments='[1,1]' where id='installment-fine'`);
      await deniedInTransaction(`update public.system_fines set paid_installments='[1,4]' where id='installment-fine'`);
      await deniedInTransaction(`update public.system_fines set paid_installments='[1,"__proto__"]' where id='installment-fine'`);
      await equal(`update public.system_fines set paid_installments='[1,2]' where id='installment-fine' returning status`,[{status:'Em Cobrança'}]);
      await deniedInTransaction(`update public.system_fines set paid_installments='[1,2,3]' where id='installment-fine'`);
      await equal(`update public.system_fines set status='Pago',paid_installments='[1,2,3]' where id='installment-fine' returning status`,[{status:'Pago'}]);
    });
  });

  // Status-only cross-module writes require an actual associated operation and
  // cannot mark a rented/workshop vehicle as available or edit its other fields.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status) values('${newVehicle}','Unassociated','STATE01','Disponível');
      update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await rejectsAtomic(()=>callStatus(newVehicle,'Manutenção'),['42501']);
      const rental=await callStatus(ids.vehicleA,'Disponível');
      assert.equal(rental.vehicle.id,ids.vehicleA);pass();
      assert.equal(rental.vehicle.status,'Alugado');pass();
      await rejectsAtomic(()=>callStatus(ids.vehicleA,'forged-status'),['22023']);
      await rejectsAtomic(()=>callStatus(ids.vehicleA,'Manutenção'),['22023']);
      await equal(`update public.vehicles set model='Unexpected full write' where id='${ids.vehicleA}' returning id`,[]);
    });
    await db.exec(`insert into public.service_orders(vehicle_id,date,plate,status) values('${ids.vehicleA}','2026-10-23','AAA0001','Aberta');
      update public.system_users set modules='{oficina}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      assert.equal((await callStatus(ids.vehicleA,'Disponível')).vehicle.status,'Manutenção');pass();
      await rejectsAtomic(()=>callStatus(newVehicle,'Disponível'),['42501']);
    });
    await db.exec(`update public.service_orders set status='Concluída';update public.system_users set modules='{vistoria}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callStatus(ids.vehicleA,'Disponível'),['42501']));
    for(const uid of [ids.investorA,ids.unknown])await as('authenticated',uid,()=>rejectsAtomic(()=>callStatus(ids.vehicleA,'Disponível'),['42501']));
    await db.exec(`update public.system_users set modules='{oficina}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{assert.equal((await callStatus(ids.vehicleA,'Disponível')).vehicle.status,'Alugado');pass();});
    await as('authenticated',ids.admin,async()=>{assert.equal((await callStatus(newVehicle,'Em preparação')).vehicle.status,'Em preparação');pass();});
  });

  // Identical request UUIDs from different actors never replay another actor's result.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status,admin_tax) values
      ('${newVehicle}','Scope one','SCOPE01','Disponível',20),('${nextVehicle}','Scope two','SCOPE02','Disponível',0);
      update public.system_users set modules='{locacao}' where id in ('${ids.employee}','${ids.logsOnly}')`);
    let first,second;
    await as('authenticated',ids.employee,async()=>{first=await callCreate(requestId,baseRental,baseClient);});
    await as('authenticated',ids.logsOnly,async()=>{
      await rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient),['23505']);
      second=await callCreate(requestId,{...baseRental,id_veiculo:nextVehicle,tipo:'daily'}, {...baseClient,cpf:'synthetic-scope-two',cnh_number:'synthetic-scope-two-cnh'});
      assert.notEqual(second.rental.id,first.rental.id);pass();
      assert.equal(second.transactions.length,0);pass();
    });
    await equal(`select count(*)::integer as count from private_security.rental_requests where request_id='${requestId}'`,[{count:2}]);
    await db.exec(`update public.system_users set modules='{}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient),['42501']));
  });

  // Explicit zero admin tax is respected; fixed tire tax is never prorated away.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status,admin_tax) values('${newVehicle}','Zero tax','ZERO001','Disponível',0);
      update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      const result=await callCreate(requestId,baseRental,baseClient,5);
      assert.deepEqual(result.transactions.map(row=>[row.cat,row.val]).sort(),[['Aluguel',400],['taxa de pneus',25]].sort());pass();
    });
  });

  // Identity fallback, duplicate identity refusal and immutable historical references.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status) values('${newVehicle}','Client matching','MATCH01','Disponível');
      insert into public.clients(id,nome,cnh_number,documentos) values('${nextVehicle}','Known CNH','synthetic-atomic-cnh','{"original":"kept"}');
      update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      const result=await callCreate(requestId,baseRental,baseClient);
      assert.equal(result.client.id,nextVehicle);pass();
      assert.equal(result.client.documentos.original,'kept');pass();
    });
  });
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status) values('${newVehicle}','Duplicate identity','DUPL001','Disponível');
      insert into public.clients(nome,cnh_number) values('Duplicate one','synthetic-atomic-cnh'),('Duplicate two','synthetic-atomic-cnh');
      update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callCreate(requestId,baseRental,baseClient),['23505']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });

  // The edit path also rolls back client/rental/old+new vehicle changes together.
  await isolated(async()=>{
    await db.exec(`insert into public.vehicles(id,model,plate,status) values
      ('${newVehicle}','Update rollback old','UPDT001','Disponível'),('${nextVehicle}','Update rollback next','UPDT002','Disponível');
      update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    let created;
    await as('authenticated',ids.employee,async()=>{created=await callCreate(requestId,baseRental,baseClient);});
    await db.exec(`create function private_security.test_vehicle_failure() returns trigger language plpgsql as $$begin
      if new.id='${nextVehicle}'::uuid then raise exception using errcode='23514',message='Synthetic final vehicle failure';end if;return new;end$$;
      create trigger synthetic_final_vehicle_failure before update on public.vehicles for each row execute function private_security.test_vehicle_failure();`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callUpdate('60000000-0000-4000-8000-000000000013',created.rental.id,
      {id_veiculo:nextVehicle,value:900},{nome:'Changed before later failure'}),['23514']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });
  await as('anon',null,async()=>{
    await denied(`select public.create_rental_atomic('${requestId}','{}','{}',null)`);
    await denied(`select public.update_rental_atomic('${requestId}','${newVehicle}','{}','{}')`);
    await denied(`select public.pay_rental_deposit('${requestId}','${newVehicle}',1,1)`);
    await denied(`select public.save_maintenance_atomic('${requestId}',null,'{}')`);
    await denied(`select public.set_operational_vehicle_status('${newVehicle}','Disponível')`);
  });
  await as('service_role',null,async()=>{
    await denied(`select public.create_rental_atomic('${requestId}','{}','{}',null)`);
    await denied(`select public.save_maintenance_atomic('${requestId}',null,'{}')`);
    await denied(`select public.set_operational_vehicle_status('${newVehicle}','Disponível')`);
  });
  const receipt='storage://La-locacao/manutencoes/fixture/receipt.pdf';
  const maintenancePayload={vehicle_plate:'AAA0001',vehicle_model:'Synthetic vehicle',date:'2026-10-23',
    service_type:'Synthetic oil service',value:125,current_km:10000,responsible:'Synthetic workshop',receipt_url:receipt};
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{manutencaoAdmin}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await deniedInTransaction("insert into public.transactions(type,val,date) values('out',-1,'2026-10-23')");
      await deniedInTransaction("insert into public.maintenances(vehicle_plate,date,service_type,value) values('AAA0001','2026-10-23','Direct bypass',1)");
      const created=await callMaintenance(requestId,null,maintenancePayload);
      assert.ok(created.maintenance.id);pass();
      assert.equal(created.maintenance.receipt_url,receipt);pass();
      assert.equal(created.transaction.type,'out');pass();
      assert.equal(created.transaction.val,-125);pass();
      assert.equal(created.transaction.cat,'Manutenção');pass();
      assert.equal(created.transaction.operation_key,'maintenance:'+created.maintenance.id);pass();
      assert.equal(created.transaction.desc,'[Manutenção #'+created.maintenance.id+'] Synthetic oil service');pass();
      await count('select * from public.transactions',0);
      const replay=await callMaintenance(requestId,null,maintenancePayload);
      assert.equal(replay.maintenance.id,created.maintenance.id);pass();
      assert.equal(replay.transaction.id,created.transaction.id);pass();
      const changed=await callMaintenance('60000000-0000-4000-8000-000000000014',created.maintenance.id,{value:150,service_type:'Synthetic updated service'});
      assert.equal(changed.maintenance.id,created.maintenance.id);pass();
      assert.equal(changed.maintenance.receipt_url,receipt);pass();
      assert.equal(changed.transaction.id,created.transaction.id);pass();
      assert.equal(changed.transaction.val,-150);pass();
      await equal(`update public.maintenances set value=1 where id='${created.maintenance.id}' returning id`,[]);
      await rejectsAtomic(()=>callMaintenance(requestId,null,{...maintenancePayload,value:126}),['22023']);
      await rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000015',null,{...maintenancePayload,operation_key:'forged'}),['22023']);
      await rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000016',null,{...maintenancePayload,receipt_url:'https://attacker.invalid/receipt'}),['22023']);
      await rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000017',null,{...maintenancePayload,value:'NaN'}),['22023']);
      await rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000019',null,{...maintenancePayload,value:-1}),['22023']);
      await equal(`delete from public.maintenances where id='${created.maintenance.id}' returning id`,[]);
    });
    await equal("select count(*)::integer as count from public.transactions where cat='Manutenção'",[{count:1}]);
  });
  // Legacy expenses are adopted only on a unique exact maintenance marker.
  await isolated(async()=>{
    await db.exec(`insert into public.maintenances(id,vehicle_plate,date,service_type,value,receipt_url)
      values('${newVehicle}','AAA0001','2026-10-23','Legacy service',10,'${receipt}');
      insert into public.transactions(id,type,val,cat,date,"desc") values('${nextVehicle}','out',-10,'Manutenção','2026-10-23','[Manutenção #${newVehicle}] Legacy service');
      update public.system_users set modules='{oficina}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      const changed=await callMaintenance(requestId,newVehicle,{value:20});
      assert.equal(changed.transaction.id,nextVehicle);pass();
      assert.equal(changed.transaction.operation_key,'maintenance:'+newVehicle);pass();
      assert.equal(changed.maintenance.receipt_url,receipt);pass();
    });
    await db.exec(`insert into public.transactions(type,val,cat,date,"desc") values('out',-9,'Manutenção','2026-10-23','[Manutenção #${newVehicle}] Duplicate legacy service')`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000018',newVehicle,{value:30}),['23505']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{oficina}' where id='${ids.employee}';
      create function private_security.test_maintenance_failure() returns trigger language plpgsql as $$begin
      raise exception using errcode='23514',message='Synthetic maintenance expense failure';end$$;
      create trigger synthetic_maintenance_expense_failure before insert on public.transactions for each row execute function private_security.test_maintenance_failure();`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callMaintenance(requestId,null,maintenancePayload),['23514']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{locacao}' where id='${ids.employee}'`);
    for(const uid of [ids.employee,ids.investorA,ids.unknown])await as('authenticated',uid,()=>rejectsAtomic(()=>callMaintenance(requestId,null,maintenancePayload),['42501']));
  });
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{oficina}' where id='${ids.employee}'`);
    let created;
    await as('authenticated',ids.employee,async()=>{
      created=await callMaintenance(requestId,null,{...maintenancePayload,responsible:'Investidor'});
      assert.equal(created.maintenance.responsible,'Investidor');pass();
      assert.equal(created.transaction.responsible,'Investidor: A');pass();
    });
    await db.exec(`create function private_security.test_expense_update_failure() returns trigger language plpgsql as $$begin
      raise exception using errcode='23514',message='Synthetic expense update failure';end$$;
      create trigger synthetic_expense_update_failure before update on public.transactions for each row execute function private_security.test_expense_update_failure();`);
    const before=await rentalSnapshot();
    await as('authenticated',ids.employee,()=>rejectsAtomic(()=>callMaintenance('60000000-0000-4000-8000-000000000021',created.maintenance.id,{value:999,receipt_url:null}),['23514']));
    assert.deepEqual(await rentalSnapshot(),before);pass();
  });
  // A new module controls notice writing without changing existing recipient
  // policies, acknowledgement function, profile grants or stored business rows.
  const noticeBusinessSnapshot=async()=>{
    const result={};
    for(const table of ['asaas_payments','clients','inspections','investor_notices','investor_payouts','investors','leads',
      'maintenances','oil_changes','rentals','replacement_contracts','service_orders','system_fines','system_logs','system_users',
      'transactions','vehicles','workshop_appointments','workshop_inventory','workshop_quotes']){
      result[table]=(await db.query(`select to_jsonb(t) as value from public.${table} t order by to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const noticeDataBefore=await noticeBusinessSnapshot();
  const noticePoliciesSql=`select tablename,policyname,cmd,qual,with_check from pg_policies where schemaname='public'
    and not (tablename='investor_notices' and policyname in ('staff_select','staff_insert','staff_update')) order by tablename,policyname`;
  const noticePoliciesBefore=(await db.query(noticePoliciesSql)).rows;
  const ackSql=`select pg_get_functiondef('public.mark_investor_notice_read(uuid)'::regprocedure) as definition`;
  const ackBefore=(await db.query(ackSql)).rows;
  const noticeMigration=await readFile('supabase/migrations/20261023210707_notices_module_create_edit.sql','utf8');
  await db.exec(noticeMigration);
  await db.exec(noticeMigration);
  assert.deepEqual(await noticeBusinessSnapshot(),noticeDataBefore);pass();
  await equal(noticePoliciesSql,noticePoliciesBefore);
  await equal(ackSql,ackBefore);
  await equal(profileGrantsSql,profileGrantsBefore);
  const callNotice=async(id,payload,request)=>(await db.query('select public.save_notice($1,$2::jsonb,$3) as result',
    [id,JSON.stringify(payload),request])).rows[0].result;
  const noticeSnapshot=async()=>({business:await noticeBusinessSnapshot(),journal:(await db.query('select * from private_security.notice_requests order by actor_id,request_id')).rows});
  const noticeRequest='70000000-0000-4000-8000-000000000001';
  const noticePayload={title:'Synthetic notice',message:'Synthetic message',target_type:'selected',target_ids:[ids.investorA],
    video_url:'https://youtu.be/dQw4w9WgXcQ?si=synthetic&t=20'};
  for(const role of ['funcionario','gerente'])await isolated(async()=>{
    await db.exec(`update public.system_users set role='${role}',modules='{avisos}' where id='${ids.employee}'`);
    let created;
    await as('authenticated',ids.employee,async()=>{
      await count('select id,name from public.investors',0);
      const directory=(await db.query('select * from public.get_notice_recipients()')).rows;
      assert.equal(directory.length,3);pass();
      assert.deepEqual(Object.keys(directory[0]).sort(),['id','name']);pass();
      await deniedInTransaction('select password from public.investors');
      await deniedInTransaction(`update public.system_users set modules='{investidores}' where id='${ids.employee}'`);
      await count('select * from public.investor_notices',3);
      await deniedInTransaction(`insert into public.investor_notices(title,message) values('Direct','Bypass')`);
      await equal(`update public.investor_notices set title='Direct bypass' returning id`,[]);
      await equal('delete from public.investor_notices returning id',[]);
      created=(await callNotice(null,noticePayload,noticeRequest)).notice;
      assert.ok(created.id);pass();
      assert.equal(created.created_by,'Employee');pass();
      assert.equal(typeof created.created_at,'string');pass();
      assert.deepEqual(created.read_by,[]);pass();
      assert.deepEqual(created.target_ids,[ids.investorA]);pass();
      assert.equal(created.video_url,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');pass();
      assert.equal((await callNotice(null,noticePayload,noticeRequest)).notice.id,created.id);pass();
      await rejectsAtomic(()=>callNotice(null,{...noticePayload,title:'Collision'},noticeRequest),['22023']);
      await deniedInTransaction('select * from private_security.notice_requests');
    });
    await as('authenticated',ids.investorB,async()=>{
      await count(`select * from public.investor_notices where id='${created.id}'`,0);
      await db.query('select public.mark_investor_notice_read($1)',[created.id]);
      await rejectsAtomic(()=>callNotice(created.id,{title:'Forbidden edit'},noticeRequest),['42501']);
    });
    await as('authenticated',ids.investorA,async()=>{
      await count(`select * from public.investor_notices where id='${created.id}'`,1);
      await db.query('select public.mark_investor_notice_read($1)',[created.id]);
      await db.query('select public.mark_investor_notice_read($1)',[created.id]);
      await equal(`select read_by from public.investor_notices where id='${created.id}'`,[{read_by:[ids.investorA]}]);
      await equal(`update public.investor_notices set title='Recipient forged' where id='${created.id}' returning id`,[]);
    });
    await as('authenticated',ids.employee,async()=>{
      const edited=(await callNotice(created.id,{title:'Edited title'},'70000000-0000-4000-8000-000000000002')).notice;
      assert.equal(edited.title,'Edited title');pass();
      assert.equal(edited.message,created.message);pass();
      assert.equal(edited.video_url,created.video_url);pass();
      assert.deepEqual(edited.target_ids,created.target_ids);pass();
      assert.deepEqual(edited.read_by,[ids.investorA]);pass();
      assert.equal(edited.created_by,created.created_by);pass();
      assert.equal(edited.created_at,created.created_at);pass();
      const replay=(await callNotice(created.id,{title:'Edited title'},'70000000-0000-4000-8000-000000000002')).notice;
      assert.equal(replay.id,created.id);pass();
      assert.deepEqual(replay.read_by,[ids.investorA]);pass();
    });
    await equal('select count(*)::integer as count from private_security.notice_requests',[{count:2}]);
  });
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}'`);
    let sequence=10;
    const nextNoticeRequest=()=>`70000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
    await as('authenticated',ids.employee,async()=>{
      for(const invalid of [
        {title:'',message:'Message'}, {title:' ',message:'Message'}, {title:'x'.repeat(201),message:'Message'},
        {title:'Title',message:''},{title:'Title',message:'x'.repeat(10001)},
        {...noticePayload,read_by:[]},{...noticePayload,created_by:'Forged'},{...noticePayload,created_at:'2000-01-01'},
        {...noticePayload,id:ids.investorA},{...noticePayload,target_ids:[]},{...noticePayload,target_ids:[ids.investorA,ids.investorA]},
        {...noticePayload,target_ids:['invalid']},{...noticePayload,target_ids:[ids.unknown]},
        {...noticePayload,target_ids:[1]},{...noticePayload,target_ids:Array(501).fill(ids.investorA)},
        {...noticePayload,target_type:'all',target_ids:[ids.investorA]}, {...noticePayload,target_type:'specific'},
        {...noticePayload,title:null},{...noticePayload,message:{}},{...noticePayload,target_ids:null},
      ])await rejectsAtomic(()=>callNotice(null,invalid,nextNoticeRequest()),['22023']);
      for(const video of ['http://youtu.be/dQw4w9WgXcQ','https://youtube.com.attacker.invalid/watch?v=dQw4w9WgXcQ',
        'https://attacker.invalid/watch?v=dQw4w9WgXcQ','javascript:alert(1)','https://www.youtube.com/watch?v=short',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&v=aaaaaaaaaaa','https://youtu.be/dQw4w9WgXcQ?redirect=bad',
        'https://user@www.youtube.com/watch?v=dQw4w9WgXcQ','https://www.youtube.com:444/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ#t=20','https://youtu.be/dQw4w9WgXcQ?si=%61',
      ])await rejectsAtomic(()=>callNotice(null,{title:'Video',message:'Message',video_url:video},nextNoticeRequest()),['22023']);
      for(const video of ['https://youtube.com/watch?feature=shared&v=dQw4w9WgXcQ&t=1m20s',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ?si=synthetic','https://m.youtube.com/embed/dQw4w9WgXcQ?start=2',
        'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share',
      ]){
        const notice=(await callNotice(null,{title:'Video',message:'Message',video_url:video},nextNoticeRequest())).notice;
        assert.equal(notice.video_url,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');pass();
        assert.equal(notice.target_type,'all');pass();
        assert.equal(notice.target_ids,null);pass();
      }
      await rejectsAtomic(()=>callNotice(ids.unknown,{title:'Missing'},nextNoticeRequest()),['22023']);
      await rejectsAtomic(()=>callNotice(null,noticePayload,null),['22023']);
      await rejectsAtomic(()=>callNotice(null,[],nextNoticeRequest()),['22023']);
    });
  });
  // Omitted legacy fields are preserved verbatim, including old video options
  // and targeting conventions; explicit video edits are canonicalized.
  await isolated(async()=>{
    const legacyId='30000000-0000-4000-8000-000000000002';
    const legacyVideo='https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=shared';
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}';
      update public.investor_notices set video_url='${legacyVideo}',read_by=array['${ids.investorA}']::uuid[],created_by='Legacy author' where id='${legacyId}'`);
    await as('authenticated',ids.employee,async()=>{
      const changed=(await callNotice(legacyId,{message:'Updated legacy body'},noticeRequest)).notice;
      assert.equal(changed.video_url,legacyVideo);pass();
      assert.equal(changed.target_type,'specific');pass();
      assert.deepEqual(changed.read_by,[ids.investorA]);pass();
      assert.equal(changed.created_by,'Legacy author');pass();
      const explicit=(await callNotice(legacyId,{video_url:legacyVideo},'70000000-0000-4000-8000-000000000003')).notice;
      assert.equal(explicit.video_url,'https://www.youtube.com/watch?v=dQw4w9WgXcQ');pass();
    });
  });
  await isolated(async()=>{
    const legacyId='30000000-0000-4000-8000-000000000002';
    // This UUID no longer has a recipient profile. The full form still sends
    // its existing selection; editing content must not erase that history.
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}';
      update public.investor_notices set target_type='selected',target_ids=array['${ids.investorA}','${ids.unknown}']::uuid[],
        read_by=array['${ids.investorA}']::uuid[] where id='${legacyId}'`);
    await as('authenticated',ids.employee,async()=>{
      const edited=(await callNotice(legacyId,{title:'Preserved historical targets',message:'New body',target_type:'selected',
        target_ids:[ids.investorA,ids.unknown]},noticeRequest)).notice;
      assert.deepEqual(edited.target_ids,[ids.investorA,ids.unknown]);pass();
      assert.deepEqual(edited.read_by,[ids.investorA]);pass();
      await rejectsAtomic(()=>callNotice(legacyId,{target_type:'selected',target_ids:[ids.investorA,ids.unknown,newVehicle]},
        '70000000-0000-4000-8000-000000000004'),['22023']);
      const selected=(await callNotice(legacyId,{target_ids:[ids.investorA,ids.unknown,ids.investorB]},
        '70000000-0000-4000-8000-000000000005')).notice;
      assert.deepEqual(selected.target_ids,[ids.investorA,ids.unknown,ids.investorB]);pass();
    });
    await as('authenticated',ids.investorB,async()=>{
      await db.query('select public.mark_investor_notice_read($1)',[legacyId]);
      await equal(`select read_by from public.investor_notices where id='${legacyId}'`,[{read_by:[ids.investorA,ids.investorB]}]);
    });
  });
  // No investor module, role metadata or previous valid request grants write.
  await isolated(async()=>{
    const legacyId='30000000-0000-4000-8000-000000000002';
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}';
      update public.investor_notices set target_type='selected',target_ids=array[null,'${ids.investorA}']::uuid[] where id='${legacyId}'`);
    await as('authenticated',ids.employee,async()=>{
      await rejectsAtomic(()=>callNotice(legacyId,{target_ids:[ids.unknown]},noticeRequest),['22023']);
      const preserved=(await callNotice(legacyId,{target_ids:[ids.investorA]},'70000000-0000-4000-8000-000000000006')).notice;
      assert.deepEqual(preserved.target_ids,[ids.investorA]);pass();
    });
  });
  // No investor module, role metadata or previous valid request grants write.
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{investidores}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await count('select * from public.investor_notices',3);
      await rejectsAtomic(()=>callNotice(null,noticePayload,noticeRequest),['42501']);
      await deniedInTransaction('select * from public.get_notice_recipients()');
      await deniedInTransaction("insert into public.investor_notices(title,message) values('Old module','Denied')");
    });
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}';
      update public.system_users set modules='{avisos}' where id='${ids.logsOnly}'`);
    let first;
    await as('authenticated',ids.employee,async()=>{first=(await callNotice(null,noticePayload,noticeRequest)).notice;});
    await as('authenticated',ids.logsOnly,async()=>{
      const second=(await callNotice(null,noticePayload,noticeRequest)).notice;
      assert.notEqual(second.id,first.id);pass();
      assert.equal(second.created_by,'Logs only');pass();
    });
    await db.exec(`update public.system_users set modules='{}' where id='${ids.employee}'`);
    await as('authenticated',ids.employee,async()=>{
      await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:ids.employee,user_metadata:{role:'administrador',modules:['avisos']}})]);
      await rejectsAtomic(()=>callNotice(null,noticePayload,noticeRequest),['42501']);
    });
    for(const uid of [ids.investorA,ids.investorB,ids.inactive,ids.unknown])await as('authenticated',uid,async()=>{
      await rejectsAtomic(()=>callNotice(null,noticePayload,noticeRequest),['42501']);
      await deniedInTransaction('select * from public.get_notice_recipients()');
    });
  });
  // Failed insert/update rolls back its journal entry and all existing rows.
  await isolated(async()=>{
    await db.exec(`update public.system_users set modules='{avisos}' where id='${ids.employee}';
      create function private_security.test_notice_failure() returns trigger language plpgsql as $$begin
      raise exception using errcode='23514',message='Synthetic notice write failure';end$$;
      create trigger synthetic_notice_failure before insert or update on public.investor_notices for each row execute function private_security.test_notice_failure();`);
    const before=await noticeSnapshot();
    await as('authenticated',ids.employee,async()=>{
      await rejectsAtomic(()=>callNotice(null,noticePayload,noticeRequest),['23514']);
      await rejectsAtomic(()=>callNotice('30000000-0000-4000-8000-000000000001',{title:'Failed edit'},noticeRequest),['23514']);
    });
    assert.deepEqual(await noticeSnapshot(),before);pass();
  });
  await isolated(async()=>{
    await as('authenticated',ids.admin,async()=>{
      assert.equal((await callNotice(null,{title:'Admin notice',message:'Body'},noticeRequest)).notice.created_by,'Admin');pass();
      await equal(`insert into public.investor_notices(id,title,message,target_type) values('${newVehicle}','Admin direct','Body','all') returning id`,[{id:newVehicle}]);
      await equal(`update public.investor_notices set title='Admin edit' where id='${newVehicle}' returning title`,[{title:'Admin edit'}]);
      await equal(`delete from public.investor_notices where id='${newVehicle}' returning id`,[{id:newVehicle}]);
    });
  });
  for(const role of ['anon','service_role'])await as(role,null,async()=>{
    await denied(`select public.save_notice(null,'{}','${noticeRequest}')`);
    await denied('select * from public.get_notice_recipients()');
    await denied('select * from private_security.notice_requests');
    await denied("select private_security.canonical_notice_video('https://youtu.be/dQw4w9WgXcQ')");
  });
  console.log(`PASS: ${checks} PostgreSQL assertions; ${process.env.SECURITY_SCHEMA_METADATA_FILE?'LIVE CATALOG TYPES/CONSTRAINTS':'repository schema'}; historical containment/read-only + final owning-module writes, atomic rentals/maintenance, constrained fine/status, separate Avisos create/edit/recipient directory with preserved receipts; anonymous, investor A/B, inactive, unlinked, staff/admin, service_role.`);
} catch(error) {
  console.error('FAIL:',error.code || error.name,error.message);
  process.exitCode=1;
} finally { await db.close(); }
