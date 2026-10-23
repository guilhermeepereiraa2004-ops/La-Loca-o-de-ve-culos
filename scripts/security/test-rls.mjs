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
  try { await test(); } finally { await db.exec('reset role'); }
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
  console.log(`PASS: ${checks} PostgreSQL assertions; ${process.env.SECURITY_SCHEMA_METADATA_FILE?'LIVE CATALOG TYPES/CONSTRAINTS':'repository schema'}; containment + full/MFA/read-only migrations; anonymous, investor A/B, inactive, unlinked, employee/manager read-only, admin CRUD, service_role.`);
} catch(error) {
  console.error('FAIL:',error.code || error.name,error.message);
  process.exitCode=1;
} finally { await db.close(); }
