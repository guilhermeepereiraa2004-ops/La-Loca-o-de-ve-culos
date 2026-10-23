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
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
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
  console.log(`PASS: ${checks} PostgreSQL assertions; ${process.env.SECURITY_SCHEMA_METADATA_FILE?'LIVE CATALOG TYPES/CONSTRAINTS':'repository schema'}; containment + full migration; anonymous, investor A/B, inactive, unlinked, employee, admin, service_role.`);
} catch(error) {
  console.error('FAIL:',error.code || error.name,error.message);
  process.exitCode=1;
} finally { await db.close(); }
