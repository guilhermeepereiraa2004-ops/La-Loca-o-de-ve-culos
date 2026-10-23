-- A distinct assigned module controls creating/editing notices. Existing
-- recipient reads/acknowledgements, profiles and notice rows are preserved.
begin;

alter policy staff_select on public.investor_notices
  using ((select private_security.has_module(array['avisos','investidores']::text[])));
-- Operators use the validated RPC; administrators retain existing direct DML.
alter policy staff_insert on public.investor_notices
  with check ((select private_security.is_admin()));
alter policy staff_update on public.investor_notices
  using ((select private_security.is_admin())) with check ((select private_security.is_admin()));

create table if not exists private_security.notice_requests (
  actor_id uuid not null,request_id uuid not null,payload_hash text not null,
  notice_id uuid,created_at timestamptz not null default now(),
  primary key(actor_id,request_id)
);
alter table private_security.notice_requests enable row level security;
revoke all on private_security.notice_requests from public,anon,authenticated,service_role;

-- Parse only HTTPS YouTube URLs and discard allowlisted presentation/sharing
-- parameters. No arbitrary host, redirect URL, port, credentials or fragment.
create or replace function private_security.canonical_notice_video(input_url text)
returns text language plpgsql immutable set search_path='' as $$
declare video_url text=btrim(input_url);base text;query_string text;video_id text;
  pair text;key_name text;key_value text;seen_keys text[]='{}';is_watch boolean=false;
begin
  if video_url is null or video_url='' then return null; end if;
  if length(video_url)>2048 or video_url ~ '[[:space:]#%]' or length(video_url)-length(replace(video_url,'?',''))>1 then
    raise exception using errcode='22023',message='Informe um link HTTPS válido do YouTube.';
  end if;
  base=split_part(video_url,'?',1);query_string=case when position('?' in video_url)>0 then split_part(video_url,'?',2) else null end;
  if base ~ '^https://((www|m)\.)?youtube\.com/watch$' then
    is_watch=true;
  elsif base ~ '^https://((www|m)\.)?youtube\.com/(shorts|embed|live)/[A-Za-z0-9_-]{11}$' then
    video_id=substring(base from '/([A-Za-z0-9_-]{11})$');
  elsif base ~ '^https://(www\.)?youtu\.be/[A-Za-z0-9_-]{11}$' then
    video_id=substring(base from '/([A-Za-z0-9_-]{11})$');
  else
    raise exception using errcode='22023',message='Informe um link HTTPS válido do YouTube.';
  end if;
  if query_string is not null then
    if query_string='' or cardinality(string_to_array(query_string,'&'))>16 then
      raise exception using errcode='22023',message='Parâmetros do vídeo inválidos.';
    end if;
    foreach pair in array string_to_array(query_string,'&') loop
      if pair !~ '^[A-Za-z_][A-Za-z0-9_]*=[A-Za-z0-9_.~-]*$' then
        raise exception using errcode='22023',message='Parâmetros do vídeo inválidos.';
      end if;
      key_name=split_part(pair,'=',1);key_value=split_part(pair,'=',2);
      if key_name=any(seen_keys) or key_name not in ('v','t','start','time_continue','si','feature','ab_channel','rel','autoplay','controls','modestbranding','list','index','pp') then
        raise exception using errcode='22023',message='Parâmetros do vídeo inválidos.';
      end if;
      seen_keys=array_append(seen_keys,key_name);
      if key_name='v' then
        if not is_watch or key_value !~ '^[A-Za-z0-9_-]{11}$' then
          raise exception using errcode='22023',message='Identificador do vídeo inválido.';
        end if;
        video_id=key_value;
      end if;
    end loop;
  end if;
  if video_id is null then raise exception using errcode='22023',message='Identificador do vídeo inválido.'; end if;
  return 'https://www.youtube.com/watch?v='||video_id;
end $$;
revoke all on function private_security.canonical_notice_video(text) from public,anon,authenticated,service_role;

create or replace function public.get_notice_recipients()
returns table(id uuid,name text) language plpgsql stable security definer set search_path='' as $$
begin
  if not private_security.can_write_modules(array['avisos']::text[]) then
    raise exception using errcode='42501',message='Permissão de Avisos necessária.';
  end if;
  return query select investor.id,investor.name from public.investors investor order by investor.name,investor.id;
end $$;

create or replace function public.save_notice(p_id uuid,p_notice jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();fingerprint text;request_row private_security.notice_requests;
  previous_row public.investor_notices;notice public.investor_notices;author_name text;
  recipient jsonb;recipient_id uuid;recipient_count integer;
begin
  if not private_security.can_write_modules(array['avisos']::text[]) then
    raise exception using errcode='42501',message='Permissão de Avisos necessária.';
  end if;
  if actor is null or p_request_id is null or p_notice is null or jsonb_typeof(p_notice)<>'object'
    or octet_length(p_notice::text)>131072
    or p_notice-array['title','message','video_url','target_type','target_ids']<>'{}'::jsonb then
    raise exception using errcode='22023',message='Campos do aviso inválidos.';
  end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object('id',p_id,'notice',p_notice)::text,'UTF8')),'hex');
  insert into private_security.notice_requests(actor_id,request_id,payload_hash) values(actor,p_request_id,fingerprint) on conflict do nothing;
  select * into request_row from private_security.notice_requests where actor_id=actor and request_id=p_request_id for update;
  if request_row.payload_hash<>fingerprint then raise exception using errcode='22023',message='Identificador já utilizado com outros dados.'; end if;
  if request_row.notice_id is not null then
    select * into notice from public.investor_notices where id=request_row.notice_id;
    if not found then raise exception using errcode='23505',message='Aviso da operação não está mais disponível.'; end if;
    return jsonb_build_object('notice',to_jsonb(notice));
  end if;
  if p_id is not null then
    select * into previous_row from public.investor_notices where id=p_id for update;
    if not found then raise exception using errcode='22023',message='Aviso não encontrado.'; end if;
  end if;
  notice=previous_row;
  if p_id is null or p_notice?'title' then
    if jsonb_typeof(p_notice->'title') is distinct from 'string' or length(btrim(p_notice->>'title')) not between 1 and 200 then
      raise exception using errcode='22023',message='Título deve ter de 1 a 200 caracteres.';
    end if;
    notice.title=btrim(p_notice->>'title');
  end if;
  if p_id is null or p_notice?'message' then
    if jsonb_typeof(p_notice->'message') is distinct from 'string' or length(btrim(p_notice->>'message')) not between 1 and 10000 then
      raise exception using errcode='22023',message='Mensagem deve ter de 1 a 10000 caracteres.';
    end if;
    notice.message=btrim(p_notice->>'message');
  end if;
  if p_notice?'video_url' then
    if jsonb_typeof(p_notice->'video_url') not in ('string','null') then raise exception using errcode='22023',message='Link do vídeo inválido.'; end if;
    notice.video_url=private_security.canonical_notice_video(p_notice->>'video_url');
  end if;
  if p_id is null then notice.target_type='all';notice.target_ids=null; end if;
  if p_notice?'target_type' then
    if jsonb_typeof(p_notice->'target_type') is distinct from 'string' or p_notice->>'target_type' not in ('all','selected') then
      raise exception using errcode='22023',message='Destinatários do aviso inválidos.';
    end if;
    notice.target_type=p_notice->>'target_type';
  end if;
  if p_id is null or p_notice?'target_type' or p_notice?'target_ids' then
    if notice.target_type='all' then
      if p_notice?'target_ids' and p_notice->'target_ids' not in ('null'::jsonb,'[]'::jsonb) then
        raise exception using errcode='22023',message='Aviso para todos não deve conter seleção de destinatários.';
      end if;
      notice.target_ids=null;
    elsif notice.target_type='selected' then
      if p_notice?'target_ids' then
        if jsonb_typeof(p_notice->'target_ids') is distinct from 'array' or jsonb_array_length(p_notice->'target_ids') not between 1 and 500 then
          raise exception using errcode='22023',message='Selecione de 1 a 500 destinatários.';
        end if;
        notice.target_ids='{}';
        for recipient in select value from jsonb_array_elements(p_notice->'target_ids') loop
          if jsonb_typeof(recipient)<>'string' or recipient#>>'{}' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
            raise exception using errcode='22023',message='Identificador de destinatário inválido.';
          end if;
          recipient_id=(recipient#>>'{}')::uuid;
          if recipient_id=any(notice.target_ids) then raise exception using errcode='22023',message='Destinatário duplicado.'; end if;
          notice.target_ids=array_append(notice.target_ids,recipient_id);
        end loop;
      end if;
      if coalesce(cardinality(notice.target_ids),0) not between 1 and 500 then
        raise exception using errcode='22023',message='Selecione de 1 a 500 destinatários.';
      end if;
      -- Historical targets may refer to an investor removed since publication.
      -- Preserve them during ordinary edits; every NEW target must exist.
      select count(*) into recipient_count from unnest(notice.target_ids) recipient(id)
        where not exists(select 1 from unnest(coalesce(previous_row.target_ids,'{}'::uuid[])) historical(id) where historical.id=recipient.id)
          and not exists(select 1 from public.investors investor where investor.id=recipient.id);
      if recipient_count>0 then raise exception using errcode='22023',message='Destinatário não encontrado.'; end if;
    else
      raise exception using errcode='22023',message='Destinatários do aviso inválidos.';
    end if;
  end if;
  if p_id is null then
    select staff.name into author_name from public.system_users staff where staff.auth_user_id=actor;
    insert into public.investor_notices(id,title,message,video_url,target_type,target_ids,read_by,created_at,created_by)
      values(gen_random_uuid(),notice.title,notice.message,notice.video_url,notice.target_type,notice.target_ids,
        '{}'::uuid[],now(),coalesce(nullif(author_name,''),'Administrador')) returning * into notice;
  else
    update public.investor_notices set title=notice.title,message=notice.message,video_url=notice.video_url,
      target_type=notice.target_type,target_ids=notice.target_ids where id=p_id returning * into notice;
  end if;
  update private_security.notice_requests set notice_id=notice.id where actor_id=actor and request_id=p_request_id;
  return jsonb_build_object('notice',to_jsonb(notice));
end $$;
revoke all on function public.get_notice_recipients(),public.save_notice(uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.get_notice_recipients(),public.save_notice(uuid,jsonb,uuid) to authenticated;
commit;
