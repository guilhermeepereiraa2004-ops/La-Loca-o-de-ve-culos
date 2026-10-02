begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.rental_closure_corrections_archive (
  rental_id uuid not null,
  archived_at timestamp with time zone not null default now(),
  reason text not null,
  rental_data jsonb not null,
  primary key (rental_id, reason)
);

alter table private.rental_closure_corrections_archive enable row level security;
revoke all on table private.rental_closure_corrections_archive from public, anon, authenticated;

insert into private.rental_closure_corrections_archive (
  rental_id,
  reason,
  rental_data
)
select
  r.id,
  'Correct early closure date reported on 2026-10-02',
  to_jsonb(r)
from public.rentals as r
where r.id = '2e42a251-78fd-4f2a-adf1-cfdde2bcdbce'
  and upper(btrim(r.user_name)) = 'MARCOS MARMO TIEDOSO'
  and upper(regexp_replace(btrim(r.placa), '[^A-Za-z0-9]', '', 'g')) = 'QMP6J30'
  and r.start_date = date '2026-08-27'
  and r.status in ('Encerrado', 'Finalizado')
on conflict (rental_id, reason) do nothing;

do $block$
declare
  v_archived_count integer;
begin
  select count(*)
  into v_archived_count
  from private.rental_closure_corrections_archive
  where rental_id = '2e42a251-78fd-4f2a-adf1-cfdde2bcdbce'
    and reason = 'Correct early closure date reported on 2026-10-02';

  if v_archived_count <> 1 then
    raise exception 'Expected to archive the Marcos Marmo rental before correction, archived %', v_archived_count;
  end if;
end;
$block$;

update public.rentals
set
  end_date = date '2026-08-28',
  documentos = jsonb_set(
    coalesce(documentos, '{}'::jsonb),
    '{closureSummary,actualClosureDate}',
    to_jsonb('2026-08-28'::text),
    true
  )
where id = '2e42a251-78fd-4f2a-adf1-cfdde2bcdbce'
  and upper(btrim(user_name)) = 'MARCOS MARMO TIEDOSO'
  and upper(regexp_replace(btrim(placa), '[^A-Za-z0-9]', '', 'g')) = 'QMP6J30'
  and start_date = date '2026-08-27'
  and status in ('Encerrado', 'Finalizado');

do $block$
declare
  v_corrected_count integer;
begin
  select count(*)
  into v_corrected_count
  from public.rentals
  where id = '2e42a251-78fd-4f2a-adf1-cfdde2bcdbce'
    and end_date = date '2026-08-28'
    and documentos #>> '{closureSummary,actualClosureDate}' = '2026-08-28';

  if v_corrected_count <> 1 then
    raise exception 'Marcos Marmo rental closure correction was not applied';
  end if;
end;
$block$;

commit;
