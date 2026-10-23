-- MFA is opt-in. Merely starting enrollment does not lock an account out.
-- Once Auth has a verified factor, staff data requires a signed AAL2 JWT.
-- Own system_users profile remains readable at AAL1 so the UI can complete the challenge.
begin;
create or replace function private_security.mfa_satisfied()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    not exists (
      select 1 from auth.mfa_factors factor
      where factor.user_id=(select auth.uid()) and factor.status::text='verified'
    ) or coalesce((select auth.jwt())->>'aal','')='aal2'
  );
$$;
revoke all on function private_security.mfa_satisfied() from public, anon;
grant execute on function private_security.mfa_satisfied() to authenticated, service_role;

create or replace function private_security.has_module(required_modules text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private_security.mfa_satisfied()) and exists (
    select 1 from public.system_users u
    where u.auth_user_id=(select auth.uid())
      and (u.role='administrador' or
        (u.role in ('funcionario','gerente') and coalesce(u.modules,'{}'::text[]) && required_modules))
  );
$$;
create or replace function private_security.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private_security.mfa_satisfied()) and exists (
    select 1 from public.system_users u where u.auth_user_id=(select auth.uid()) and u.role='administrador'
  );
$$;
create or replace function private_security.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private_security.mfa_satisfied()) and exists (
    select 1 from public.system_users u where u.auth_user_id=(select auth.uid())
      and u.role in ('administrador','funcionario','gerente')
  );
$$;
revoke all on function private_security.has_module(text[]), private_security.is_admin(), private_security.is_staff() from public, anon;
grant execute on function private_security.has_module(text[]), private_security.is_admin(), private_security.is_staff() to authenticated, service_role;
commit;
