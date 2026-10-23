-- Staff modules authorize reading only. Business writes are administrator-only.
-- This changes no data, SELECT policy, investor policy, profile grant or RPC.
-- Own-actor audit append remains a separate permitted operation.
begin;

create or replace function private_security.allow_admin_write()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private_security.is_admin();
$$;
revoke all on function private_security.allow_admin_write() from public, anon;
grant execute on function private_security.allow_admin_write() to authenticated, service_role;

do $$
declare policy_row record;
begin
  for policy_row in
    select table_name.relname as table_name, policy.polname, policy.polcmd
    from pg_catalog.pg_policy policy
    join pg_catalog.pg_class table_name on table_name.oid=policy.polrelid
    join pg_catalog.pg_namespace table_schema on table_schema.oid=table_name.relnamespace
    where table_schema.nspname='public'
      and policy.polname in ('staff_insert','staff_update','staff_delete')
  loop
    if policy_row.polname='staff_insert' and policy_row.polcmd='a' then
      execute format('alter policy staff_insert on public.%I with check ((select private_security.allow_admin_write()))',policy_row.table_name);
    elsif policy_row.polname='staff_update' and policy_row.polcmd='w' then
      execute format('alter policy staff_update on public.%I using ((select private_security.allow_admin_write())) with check ((select private_security.allow_admin_write()))',policy_row.table_name);
    elsif policy_row.polname='staff_delete' and policy_row.polcmd='d' then
      execute format('alter policy staff_delete on public.%I using ((select private_security.allow_admin_write()))',policy_row.table_name);
    else
      raise exception 'Unexpected staff write policy command; inspect catalog before applying';
    end if;
  end loop;
end $$;

commit;
