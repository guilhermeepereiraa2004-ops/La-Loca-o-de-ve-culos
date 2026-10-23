-- READ ONLY. Output contains PII: save only to an ignored/private operator file,
-- never print/commit it. This is NOT an approved provision-auth manifest.
-- Every candidate must be independently reviewed after the incident.
with profiles as (
  select 'system_users'::text as table_name,id as record_id,lower(trim(email)) as email,
    true as active,role='administrador' as legacy_admin
  from public.system_users
  union all
  select 'investors',id,lower(trim(email)),status='Ativo',false from public.investors
), email_counts as (
  select email,count(*) as uses from profiles where email is not null and email<>'' group by email
), classified as (
  select p.*,coalesce(p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$',false) as valid_email,
    coalesce(e.uses,0) as email_uses from profiles p left join email_counts e using(email)
)
select jsonb_build_object(
  'status','CANDIDATES_ONLY_NOT_APPROVED',
  'summary',jsonb_build_object(
    'profiles_total',(select count(*) from classified),
    'invalid_or_missing_email',(select count(*) from classified where not valid_email),
    'duplicate_email_groups',(select count(*) from email_counts where uses>1),
    'inactive_profiles',(select count(*) from classified where not active),
    'legacy_admins_requiring_identity_review',(select count(*) from classified where legacy_admin),
    'eligible_for_manual_review',(select count(*) from classified where valid_email and email_uses=1 and active)
  ),
  'candidates',(select coalesce(jsonb_agg(jsonb_build_object(
    'table',table_name,'record_id',record_id,'email',email,'create_auth_user',true,
    'needs_manual_review',true,'legacy_admin_requires_explicit_approval',legacy_admin
  ) order by table_name,record_id),'[]') from classified where valid_email and email_uses=1 and active)
) as auth_migration_candidates;
