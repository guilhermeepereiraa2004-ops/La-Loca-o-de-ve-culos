-- READ ONLY preservation inventory. Returns counts and aggregate fingerprints only.
-- Compare before/after MIGRATION, BEFORE bootstrap adds one legitimate profile.
select jsonb_build_object('public_tables',(select jsonb_agg(s order by table_name) from (select 'asaas_payments'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."asaas_payments" t
union all
select 'clients'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."clients" t
union all
select 'inspections'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."inspections" t
union all
select 'investor_notices'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."investor_notices" t
union all
select 'investor_payouts'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."investor_payouts" t
union all
select 'investors'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."investors" t
union all
select 'leads'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."leads" t
union all
select 'maintenances'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."maintenances" t
union all
select 'oil_changes'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."oil_changes" t
union all
select 'rentals'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."rentals" t
union all
select 'replacement_contracts'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."replacement_contracts" t
union all
select 'service_orders'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."service_orders" t
union all
select 'system_fines'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."system_fines" t
union all
select 'system_logs'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."system_logs" t
union all
select 'system_users'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."system_users" t
union all
select 'transactions'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."transactions" t
union all
select 'vehicles'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."vehicles" t
union all
select 'workshop_appointments'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."workshop_appointments" t
union all
select 'workshop_inventory'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."workshop_inventory" t
union all
select 'workshop_quotes'::text as table_name,count(*)::bigint as row_count,md5(coalesce(string_agg(md5((to_jsonb(t)-'auth_user_id')::text),'' order by md5((to_jsonb(t)-'auth_user_id')::text)),'')) as row_fingerprint from public."workshop_quotes" t)s),'storage_objects',(select jsonb_build_object('row_count',count(*),'row_fingerprint',md5(coalesce(string_agg(md5(to_jsonb(o)::text),'' order by md5(to_jsonb(o)::text)),''))) from storage.objects o),'auth_users',(select count(*) from auth.users)) as preservation_snapshot;
