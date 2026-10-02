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

create temporary table corrected_weekly_return_dates (
  rental_id uuid primary key,
  correct_end_date date not null,
  expected_name text not null,
  normalized_plate text not null
) on commit drop;

insert into corrected_weekly_return_dates (
  rental_id,
  correct_end_date,
  expected_name,
  normalized_plate
)
values
  ('dc372b65-4a67-4942-9c20-ec842aa58ad0', date '2026-07-28', 'CARLOS EDUARDO MACHADO AGUIAR', 'QMH3210'),
  ('2233ef89-642c-4090-8d0b-f3b8809ccaca', date '2026-09-28', 'JOHN CLEYSON DA SILVA', 'QKN8C49'),
  ('10fcf218-7e6b-4206-a335-8ffa2320550f', date '2026-08-03', 'ANDRÉ JOSÉ WANDERLEY DE ANDRADE MELO', 'QGB3D90'),
  ('cb007872-c1f3-4c59-8129-a223f59c6d4a', date '2026-08-03', 'UEVERTON FRAGA MENDONÇA', 'PYS5F92'),
  ('c2e836fa-9fb8-45ba-a6b0-9868339225a8', date '2026-08-03', 'PAULO MENEZES COSTA', 'QQO2I29'),
  ('85ad13d1-390d-4a0a-9fbf-ec325820995d', date '2026-08-03', 'DANIEL DA SILVA DANTAS GALVÃO', 'QMF8762'),
  ('c421982b-5f1f-4a2d-94cb-e370a631f4e3', date '2026-08-27', 'MARCOS MARMO TIEDOSO', 'QPL4G51'),
  ('7ddbafc7-3d95-4ae8-944a-8250aab85f96', date '2026-08-17', 'SERGIO AUGUSTO LELLIS FILHO', 'TMW8E96'),
  ('3e5a5846-a2d5-45c3-ba49-7fde8573d8c3', date '2026-09-10', 'RAFAEL CABRAL DA SILVA', 'OEP0985'),
  ('80848cda-3655-4c39-8342-30dc45d476e0', date '2026-09-18', 'FABRICIO FONTES DOS SANTOS', 'TOC5I10'),
  ('e7555a27-b06a-442b-9abc-e9d1fd872de2', date '2026-07-31', 'RAUL BRENO FERREIRA DE CAMPOS', 'QME5361'),
  ('24851c9e-20af-44c6-8487-def57afc88ba', date '2026-08-03', 'RAMON SANTANA REIS', 'QMO2C55'),
  ('4d3577c9-b4e4-41ca-a469-9bb6724241f5', date '2026-08-03', 'JOSÉ NEIGLISSON COUTO SILVA', 'RVY0H28'),
  ('7cd7dac0-6eec-487f-a808-14078dbca9bd', date '2026-08-10', 'ARTEFIO CARVALHO MACHADO SANTOS', 'TXA5E26'),
  ('11e59a5c-0a3f-4a1d-8df9-932bc26453e4', date '2026-08-17', 'EMERSON FERNANDO AVELAR', 'TDB5C52'),
  ('47dca1c9-335e-489f-821e-7a2bc992c20a', date '2026-09-21', 'ITALO MARCOS DOS SANTOS VENCESLAU', 'QPH6E02'),
  ('8b4e3b42-52b1-4391-93b5-dfba970bc312', date '2026-08-20', 'EDUARDO SILVA DOS SANTOS', 'QMJ0I24'),
  ('53b45e50-57c8-4058-a022-9c33bb2be6c3', date '2026-08-03', 'SERGIO AUGUSTO LELLIS FILHO', 'TOA2F88'),
  ('06507573-47f5-40fd-97ad-785ef61ebd12', date '2026-09-09', 'RANDISON OLIVEIRA SANTOS', 'RVY0H28'),
  ('9f6ede76-c8d0-4706-91cc-e8b906243e92', date '2026-09-01', 'THIAGO ZACARIAS LIMA SANTOS', 'SKF6D08');

insert into private.rental_closure_corrections_archive (
  rental_id,
  reason,
  rental_data
)
select
  r.id,
  'Remove weekly return-day billing artifacts reported on 2026-10-02',
  to_jsonb(r)
from public.rentals as r
join corrected_weekly_return_dates as c
  on c.rental_id = r.id
 and upper(btrim(r.user_name)) = upper(c.expected_name)
 and upper(regexp_replace(btrim(r.placa), '[^A-Za-z0-9]', '', 'g')) = c.normalized_plate
where r.status in ('Encerrado', 'Finalizado')
  and coalesce(r.rental_type, 'weekly') <> 'daily'
on conflict (rental_id, reason) do nothing;

do $block$
declare
  v_archived_count integer;
begin
  select count(*)
  into v_archived_count
  from private.rental_closure_corrections_archive
  where reason = 'Remove weekly return-day billing artifacts reported on 2026-10-02';

  if v_archived_count <> 20 then
    raise exception 'Expected to archive 20 weekly rentals before correction, archived %', v_archived_count;
  end if;
end;
$block$;

update public.rentals as r
set
  end_date = c.correct_end_date,
  documentos = jsonb_set(
    coalesce(r.documentos, '{}'::jsonb),
    '{closureSummary}',
    coalesce(r.documentos -> 'closureSummary', '{}'::jsonb)
      || jsonb_build_object('actualClosureDate', c.correct_end_date::text),
    true
  )
from corrected_weekly_return_dates as c
where r.id = c.rental_id;

with thiago_summary as (
  select
    r.id,
    r.documentos -> 'closureSummary' as summary,
    coalesce(
      jsonb_agg(cycle) filter (
        where cycle ->> 'labelRef' <> 'Semana 9 (Ref: 01/09/2026 a 01/09/2026)'
      ),
      '[]'::jsonb
    ) as remaining_cycles,
    coalesce(
      sum((cycle ->> 'debtValue')::numeric) filter (
        where cycle ->> 'labelRef' <> 'Semana 9 (Ref: 01/09/2026 a 01/09/2026)'
      ),
      0
    ) as remaining_total
  from public.rentals as r
  cross join lateral jsonb_array_elements(
    coalesce(r.documentos #> '{closureSummary,unpaidCyclesList}', '[]'::jsonb)
  ) as cycle
  where r.id = '9f6ede76-c8d0-4706-91cc-e8b906243e92'
  group by r.id, r.documentos -> 'closureSummary'
)
update public.rentals as r
set documentos = jsonb_set(
  r.documentos,
  '{closureSummary}',
  s.summary || jsonb_build_object(
    'actualClosureDate', '2026-09-01',
    'unpaidCyclesList', s.remaining_cycles,
    'unpaidRentals', s.remaining_total,
    'baseDebts', s.remaining_total,
    'totalDebts', s.remaining_total,
    'balance', s.remaining_total,
    'proratedDaysUsed', 0,
    'hasProratedAdjust', false,
    'rentalCalculationBreakdown',
      coalesce(s.summary -> 'rentalCalculationBreakdown', '{}'::jsonb)
        || jsonb_build_object(
          'days', 0,
          'total', s.remaining_total,
          'tireTaxCycles', jsonb_array_length(s.remaining_cycles)
        )
  ),
  true
)
from thiago_summary as s
where r.id = s.id;

do $block$
declare
  v_corrected_count integer;
  v_thiago_phantom_count integer;
begin
  select count(*)
  into v_corrected_count
  from public.rentals as r
  join corrected_weekly_return_dates as c
    on c.rental_id = r.id
  where r.end_date = c.correct_end_date
    and r.documentos #>> '{closureSummary,actualClosureDate}' = c.correct_end_date::text;

  if v_corrected_count <> 20 then
    raise exception 'Expected to correct 20 weekly rentals, corrected %', v_corrected_count;
  end if;

  select count(*)
  into v_thiago_phantom_count
  from public.rentals as r
  cross join lateral jsonb_array_elements(
    coalesce(r.documentos #> '{closureSummary,unpaidCyclesList}', '[]'::jsonb)
  ) as cycle
  where r.id = '9f6ede76-c8d0-4706-91cc-e8b906243e92'
    and cycle ->> 'labelRef' = 'Semana 9 (Ref: 01/09/2026 a 01/09/2026)';

  if v_thiago_phantom_count <> 0 then
    raise exception 'Thiago return-day billing artifact was not removed';
  end if;
end;
$block$;

commit;
