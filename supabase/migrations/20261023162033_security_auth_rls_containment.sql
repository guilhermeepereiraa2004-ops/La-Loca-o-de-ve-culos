-- Security cutover. Review DB-REMEDIATION.md and obtain production approval first.
-- This migration preserves business data and legacy passwords but makes them
-- inaccessible to browser roles. Account provisioning/reset is a separate step.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create schema if not exists private_security;
revoke all on schema private_security from public, anon, authenticated;
grant usage on schema private_security to authenticated, service_role;
revoke create on schema public from public, anon, authenticated;

alter table public.system_users add column if not exists auth_user_id uuid;
alter table public.investors add column if not exists auth_user_id uuid;
create unique index if not exists security_system_users_auth_uid_key on public.system_users(auth_user_id);
create unique index if not exists security_investors_auth_uid_key on public.investors(auth_user_id);
do $$
begin
  if not exists(select 1 from pg_constraint where conrelid='public.system_users'::regclass and conname='system_users_auth_user_id_fkey') then
    alter table public.system_users add constraint system_users_auth_user_id_fkey
      foreign key(auth_user_id) references auth.users(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.investors'::regclass and conname='investors_auth_user_id_fkey') then
    alter table public.investors add constraint investors_auth_user_id_fkey
      foreign key(auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- Defaults do not expose future tables, sequences or RPCs accidentally.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private_security
  revoke execute on functions from public, anon, authenticated;

-- Eliminate every older permissive policy (policies combine with OR). Include
-- tables created manually and historical correction/backup tables, deny by default.
do $$
declare r record; col record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
  for r in select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m')
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated',r.relname);
    -- Table revocation alone does not remove explicit column grants.
    for col in select a.attname from pg_attribute a
      where a.attrelid=format('public.%I',r.relname)::regclass and a.attnum>0 and not a.attisdropped
    loop
      execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.%I from public, anon, authenticated',
        col.attname,col.attname,col.attname,col.attname,r.relname);
    end loop;
    if r.relkind in ('r','p') then
      execute format('alter table public.%I enable row level security',r.relname);
    end if;
  end loop;
end $$;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Roles/modules come from this protected table, never user_metadata/localStorage.
-- Definers live in a schema excluded from the Data API, fixed search_path,
-- auth.uid check, no dynamic SQL or caller-supplied user id.
create or replace function private_security.has_module(required_modules text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.system_users u
    where u.auth_user_id=(select auth.uid())
      and (u.role='administrador' or
        (u.role in ('funcionario','gerente') and coalesce(u.modules,'{}'::text[]) && required_modules))
  );
$$;
create or replace function private_security.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.system_users u where u.auth_user_id=(select auth.uid()) and u.role='administrador'
  );
$$;
create or replace function private_security.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.system_users u where u.auth_user_id=(select auth.uid())
      and u.role in ('administrador','funcionario','gerente')
  );
$$;
create or replace function private_security.investor_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select i.id from public.investors i where (select auth.uid()) is not null
    and i.auth_user_id=(select auth.uid()) and i.status='Ativo' limit 1;
$$;
create or replace function private_security.owns_vehicle(vehicle_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.vehicles v where v.id=vehicle_id
      and v.investor_id=(select private_security.investor_id())
  );
$$;
create or replace function private_security.owns_plate(vehicle_plate text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and vehicle_plate is not null
    and length(trim(vehicle_plate))>0 and exists (
      select 1 from public.vehicles v where v.plate=vehicle_plate
        and v.investor_id=(select private_security.investor_id())
    );
$$;
create or replace function private_security.can_read_storage_object(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (select private_security.is_admin()) or
    case split_part(object_name,'/',1)
      when 'condutores' then private_security.has_module(array['clientes','locacao']::text[])
      when 'veiculos' then private_security.has_module(array['frota','investidores']::text[])
      when 'vistorias' then private_security.has_module(array['vistoria']::text[])
      when 'manutencoes' then private_security.has_module(array['manutencaoAdmin','oficina']::text[])
      when 'contratos' then private_security.has_module(array['locacao','faturamento']::text[])
      else false
    end
  );
$$;
revoke execute on all functions in schema private_security from public, anon, authenticated;
grant execute on all functions in schema private_security to authenticated, service_role;

-- Explicit table/module map. Unknown/backup/Asaas tables remain deny-all.
do $$
declare r record;
begin
  for r in select * from (values
    ('vehicles', array['frota','locacao','investidores','manutencaoAdmin','vistoria','oficina']::text[]),
    ('clients', array['clientes','locacao']::text[]),
    ('rentals', array['locacao','faturamento','caucao','multas']::text[]),
    ('leads', array['leads']::text[]),
    ('transactions', array['financeiro','faturamento','investidores','caucao']::text[]),
    ('maintenances', array['manutencaoAdmin','oficina']::text[]),
    ('inspections', array['vistoria']::text[]),
    ('service_orders', array['oficina','manutencaoAdmin']::text[]),
    ('replacement_contracts', array['oficina','locacao']::text[]),
    ('system_fines', array['multas','faturamento']::text[]),
    ('fines', array['multas','faturamento']::text[]),
    ('oil_changes', array['oficina','manutencaoAdmin']::text[]),
    ('workshop_appointments', array['oficina']::text[]),
    ('workshop_quotes', array['oficina']::text[]),
    ('workshop_inventory', array['oficina']::text[]),
    ('workshop_financials', array['oficina','financeiro']::text[]),
    ('investor_payouts', array['investidores','financeiro']::text[]),
    ('investor_notices', array['investidores']::text[])
  ) as permission_map(table_name, modules)
  loop
    if to_regclass(format('public.%I',r.table_name)) is null then continue; end if;
    execute format('grant select, insert, update, delete on public.%I to authenticated', r.table_name);
    execute format('create policy staff_select on public.%I for select to authenticated using ((select private_security.has_module(%L::text[])))',r.table_name,r.modules);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select private_security.has_module(%L::text[])))',r.table_name,r.modules);
    execute format('create policy staff_update on public.%I for update to authenticated using ((select private_security.has_module(%L::text[]))) with check ((select private_security.has_module(%L::text[])))',r.table_name,r.modules,r.modules);
    execute format('create policy staff_delete on public.%I for delete to authenticated using ((select private_security.has_module(%L::text[])))',r.table_name,r.modules);
    -- Existing remote schema revoked service_role DML on some tables.
    execute format('grant select, insert, update, delete on public.%I to service_role',r.table_name);
  end loop;
end $$;

-- Profiles have column grants, so SELECT * fails rather than leaking passwords.
grant select (id,name,email,role,modules,created_at,auth_user_id)
  on public.system_users to authenticated;
create policy system_users_select on public.system_users for select to authenticated
  using (auth_user_id=(select auth.uid()) or (select private_security.is_admin()));
grant select (id,name,email,phone,cpf,address,status,bank,pix,created_at,auth_user_id)
  on public.investors to authenticated;
create policy investors_select on public.investors for select to authenticated
  using (id=(select private_security.investor_id()) or
    (select private_security.has_module(array['investidores','frota']::text[])));
grant select,insert,update,delete on public.system_users,public.investors to service_role;
-- No direct profile writes, even for an admin JWT. Use the server admin API.

create policy investor_vehicles on public.vehicles for select to authenticated
  using (investor_id=(select private_security.investor_id()));
create policy investor_transactions on public.transactions for select to authenticated
  using (private_security.owns_plate(vehicle_plate));
create policy investor_maintenances on public.maintenances for select to authenticated
  using (private_security.owns_plate(vehicle_plate));
create policy investor_oil_changes on public.oil_changes for select to authenticated
  using (private_security.owns_plate(vehicle_plate));
create policy investor_service_orders on public.service_orders for select to authenticated
  using (private_security.owns_vehicle(vehicle_id));
create policy investor_replacement_contracts on public.replacement_contracts for select to authenticated
  using (private_security.owns_plate(main_vehicle_plate));
create policy investor_payouts on public.investor_payouts for select to authenticated
  using (investor_id=(select private_security.investor_id())::text);
create policy investor_notices on public.investor_notices for select to authenticated
  using ((select private_security.investor_id()) is not null and
    (target_type='all' or (select private_security.investor_id())=any(target_ids)));

-- Auditing is append-only for linked staff; caller identity cannot be forged.
grant select, insert on public.system_logs to authenticated;
grant usage on sequence public.system_logs_id_seq to authenticated;
create policy system_logs_select on public.system_logs for select to authenticated
  using ((select private_security.has_module(array['logs']::text[])));
create policy system_logs_insert on public.system_logs for insert to authenticated
  with check ((select private_security.is_staff()) and user_email=(
    select u.email from public.system_users u where u.auth_user_id=(select auth.uid())
  ));
grant select, insert on public.system_logs to service_role;
grant usage on all sequences in schema public to service_role;

-- Intentional anonymous projection. Never return plates, owners, documents or
-- legacy private URLs. Publish only curated marketing images in the new bucket.
create or replace function public.get_public_fleet()
returns table(id uuid, model text, year text, image text, status text,
  weekly_rental numeric, is_favorite boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select v.id,v.model,v.year,
    case when v.image like 'https://ucfzkzpmvjekgotexriq.supabase.co/storage/v1/object/public/vehicle-public-images/%'
      then v.image else null end,
    v.status,v.weekly_rental,v.is_favorite,v.created_at
  from public.vehicles v where v.status in ('Disponível','Alugado')
  order by v.is_favorite desc nulls last,v.created_at desc limit 200;
$$;
revoke all on function public.get_public_fleet() from public, anon, authenticated;
grant execute on function public.get_public_fleet() to anon, authenticated;

-- Investors only need rental amounts/tax/vehicle; hide tenant/driver PII.
create or replace function public.get_investor_rentals()
returns table(id uuid,id_veiculo uuid,vehicle_plate text,placa text,
  start_date date,end_date date,value numeric,tire_tax numeric,
  imposto_de_pneus numeric,status text,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id,coalesce(r.id_veiculo,r."id_do_veículo"),v.plate,v.plate,
    r.start_date,r.end_date,r.value,r.tire_tax,r.imposto_de_pneus,r.status,r.created_at
  from public.rentals r join public.vehicles v on v.id=coalesce(r.id_veiculo,r."id_do_veículo")
  where (select auth.uid()) is not null and v.investor_id=(select private_security.investor_id())
  order by r.created_at desc limit 10000;
$$;
revoke all on function public.get_investor_rentals() from public,anon,authenticated;
grant execute on function public.get_investor_rentals() to authenticated;

-- Atomic read acknowledgement: cannot alter recipients/message/other readers.
create or replace function public.mark_investor_notice_read(p_notice_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := private_security.investor_id();
begin
  if (select auth.uid()) is null or caller is null then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  update public.investor_notices set read_by=array_append(coalesce(read_by,'{}'::uuid[]),caller)
  where id=p_notice_id and (target_type='all' or caller=any(target_ids))
    and not (caller=any(coalesce(read_by,'{}'::uuid[])));
end;
$$;
revoke all on function public.mark_investor_notice_read(uuid) from public,anon,authenticated;
grant execute on function public.mark_investor_notice_read(uuid) to authenticated;

create index if not exists security_vehicles_investor_idx on public.vehicles(investor_id);
create index if not exists security_transactions_plate_idx on public.transactions(vehicle_plate);

-- Known private legacy bucket: no documents move/delete. Old public URLs stop
-- working; staff must request short-lived signed URLs. Investors need a reviewed
-- object-to-investor mapping before receiving legacy document access.
update storage.buckets set public=false,file_size_limit=52428800,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document','video/mp4','video/webm']
where id='La-locacao';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vehicle-public-images','vehicle-public-images',true,5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Restrictive policies neutralize any pre-existing permissive Storage policy.
-- Browser writes are denied even for staff: validated secure-upload uses service_role.
create policy la_storage_anon_select_guard on storage.objects as restrictive for select to anon
using (bucket_id<>'La-locacao');
create policy la_storage_select_guard on storage.objects as restrictive for select to authenticated
using (bucket_id not in ('La-locacao','vehicle-public-images') or
  (bucket_id='vehicle-public-images') or
  (bucket_id='La-locacao' and private_security.can_read_storage_object(name)));
create policy la_storage_staff_read on storage.objects for select to authenticated
using ((bucket_id='La-locacao' and private_security.can_read_storage_object(name)) or
  (bucket_id='vehicle-public-images' and (select private_security.is_staff())));
create policy la_storage_insert_guard on storage.objects as restrictive for insert to anon,authenticated
with check (bucket_id not in ('La-locacao','vehicle-public-images'));
create policy la_storage_update_guard on storage.objects as restrictive for update to anon,authenticated
using (bucket_id not in ('La-locacao','vehicle-public-images'))
with check (bucket_id not in ('La-locacao','vehicle-public-images'));
create policy la_storage_delete_guard on storage.objects as restrictive for delete to anon,authenticated
using (bucket_id not in ('La-locacao','vehicle-public-images'));

-- Remove only the emergency guard after the permanent restrictive guards exist.
drop policy if exists la_emergency_storage_guard on storage.objects;

-- Server-only shared rate limiter. One row per actor/key, bounded window inputs;
-- atomic upsert also serializes concurrent requests. No direct API table access.
create table if not exists private_security.rate_limits (
  key text primary key,
  window_start bigint not null,
  request_count integer not null
);
alter table private_security.rate_limits enable row level security;
revoke all on private_security.rate_limits from public,anon,authenticated;
create or replace function public.consume_security_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_window bigint; accepted boolean;
begin
  if p_key is null or length(p_key) not between 1 and 200 or
     p_limit is null or p_limit not between 1 and 1000 or
     p_window_seconds is null or p_window_seconds not between 1 and 3600 then
    return false;
  end if;
  current_window := floor(extract(epoch from clock_timestamp())/p_window_seconds)::bigint;
  insert into private_security.rate_limits as limits(key,window_start,request_count)
  values(p_key,current_window,1)
  on conflict(key) do update set window_start=excluded.window_start,
    request_count=case when limits.window_start=excluded.window_start then limits.request_count+1 else 1 end
  where limits.window_start<>excluded.window_start or limits.request_count<p_limit
  returning true into accepted;
  return coalesce(accepted,false);
end;
$$;
revoke all on function public.consume_security_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_security_rate_limit(text,integer,integer) to service_role;

notify pgrst,'reload schema';
commit;
