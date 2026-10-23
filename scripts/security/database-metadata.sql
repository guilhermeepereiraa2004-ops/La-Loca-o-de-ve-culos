-- Read-only incident inventory. Catalog metadata and aggregate counts only.
select jsonb_build_object(
  'tables',(select coalesce(jsonb_agg(t),'[]') from (
    select c.relname as table_name,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') order by 1
  )t),
  'columns',(select coalesce(jsonb_agg(t),'[]') from (
    select table_name,column_name,data_type,is_nullable
    from information_schema.columns where table_schema='public' order by table_name,ordinal_position
  )t),
  'constraints',(select coalesce(jsonb_agg(t),'[]') from (
    select c.conname,c.conrelid::regclass::text as table_name,c.contype,pg_get_constraintdef(c.oid) as definition
    from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by 2,1
  )t),
  'policies',(select coalesce(jsonb_agg(t),'[]') from (
    select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
    from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname
  )t),
  'table_grants',(select coalesce(jsonb_agg(t),'[]') from (
    select table_name,grantee,string_agg(privilege_type,',' order by privilege_type) as privileges
    from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC','service_role')
    group by table_name,grantee order by 1,2
  )t),
  'views',(select coalesce(jsonb_agg(t),'[]') from (
    select c.relname,c.relkind,c.reloptions,has_table_privilege('anon',c.oid,'SELECT') as anon_select,
      has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m') order by 1
  )t),
  'functions',(select coalesce(jsonb_agg(t),'[]') from (
    select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1
  )t),
  'buckets',(select coalesce(jsonb_agg(t),'[]') from (
    select b.id,b.name,b.public,b.file_size_limit,b.allowed_mime_types,
      (select count(*) from storage.objects o where o.bucket_id=b.id) as object_count
    from storage.buckets b order by b.id
  )t),
  'credential_counts',jsonb_build_object(
    'system_users',(select count(*) from public.system_users),
    'system_password_present',(select count(*) from public.system_users where password is not null and password<>''),
    'system_password_known_hash_prefix',(select count(*) from public.system_users where password ~ '^\$(2[aby]|argon2(id|i|d))\$'),
    'investors',(select count(*) from public.investors),
    'investor_password_present',(select count(*) from public.investors where password is not null and password<>''),
    'investor_password_known_hash_prefix',(select count(*) from public.investors where password ~ '^\$(2[aby]|argon2(id|i|d))\$'),
    'auth_users',(select count(*) from auth.users)
  ),
  'role_counts',(select coalesce(jsonb_agg(t),'[]') from (
    select role,count(*) as profiles from public.system_users group by role order by role
  )t),
  'data_api_db_schemas',current_setting('pgrst.db_schemas',true)
) as security_metadata;
