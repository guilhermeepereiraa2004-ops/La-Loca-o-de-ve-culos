-- Append a caller's activity without requiring permission to read other logs.
-- Existing audit history, SELECT policy and business records are untouched.
begin;
create or replace function public.record_system_activity(p_action text,p_target_type text,p_target_id text,p_description text,p_details jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();staff public.system_users;investor public.investors;entry public.system_logs;
begin
  if actor is null or not private_security.mfa_satisfied() then raise exception using errcode='42501',message='Acesso não autorizado.'; end if;
  select * into staff from public.system_users where auth_user_id=actor;
  if staff.id is null then
    select * into investor from public.investors where auth_user_id=actor and status='Ativo';
    if investor.id is null or p_action is distinct from 'Login' or p_target_type is distinct from 'Auth'
      or p_target_id is distinct from investor.id::text then raise exception using errcode='42501',message='Atividade não autorizada.'; end if;
  elsif staff.role not in ('administrador','gerente','funcionario') then
    raise exception using errcode='42501',message='Atividade não autorizada.';
  end if;
  if nullif(btrim(p_action),'') is null or length(p_action)>100 or nullif(btrim(p_description),'') is null
    or length(p_description)>10000 or length(p_target_type)>100 or length(p_target_id)>200
    or octet_length(coalesce(p_details,'null'::jsonb)::text)>16384 then raise exception using errcode='22023',message='Dados de atividade inválidos.'; end if;
  insert into public.system_logs(created_at,user_name,user_email,action,target_type,target_id,description,details)
    values(clock_timestamp(),coalesce(staff.name,investor.name),coalesce(staff.email,investor.email),p_action,p_target_type,p_target_id,
      case when staff.id is null then 'Login realizado com sucesso no portal do investidor' else p_description end,
      case when staff.id is null then null else p_details end) returning * into entry;
  return jsonb_build_object('log',to_jsonb(entry));
end $$;
revoke all on function public.record_system_activity(text,text,text,text,jsonb) from public,anon,service_role;
grant execute on function public.record_system_activity(text,text,text,text,jsonb) to authenticated;
commit;
