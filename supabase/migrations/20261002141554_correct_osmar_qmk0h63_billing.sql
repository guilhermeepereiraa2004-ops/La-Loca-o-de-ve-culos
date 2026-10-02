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

create table if not exists private.transaction_corrections_archive (
  transaction_id uuid not null,
  archived_at timestamp with time zone not null default now(),
  reason text not null,
  transaction_data jsonb not null,
  primary key (transaction_id, reason)
);

alter table private.transaction_corrections_archive enable row level security;
revoke all on table private.transaction_corrections_archive from public, anon, authenticated;

insert into private.rental_closure_corrections_archive (
  rental_id,
  reason,
  rental_data
)
select
  r.id,
  'Remove Osmar QMK-0H63 closure manual week 6 reported on 2026-10-02',
  to_jsonb(r)
from public.rentals as r
where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202'
  and upper(btrim(r.user_name)) = 'OSMAR CESAR SOUZA DOS SANTOS BAHIA'
  and upper(regexp_replace(btrim(r.placa), '[^A-Za-z0-9]', '', 'g')) = 'QMK0H63'
  and r.start_date = date '2026-08-28'
  and r.status in ('Encerrado', 'Finalizado')
on conflict (rental_id, reason) do nothing;

insert into private.transaction_corrections_archive (
  transaction_id,
  reason,
  transaction_data
)
select
  t.id,
  'Remove Osmar QMK-0H63 closure manual week 6 and reallocate deposit',
  to_jsonb(t)
from public.transactions as t
where t.id in (
  'd6ea96a7-64ac-477c-bd19-0c55eb7fabde',
  '70b610bf-d808-4bac-b72b-a6101d06ce04',
  '353d1547-e830-454e-9d07-3a19fc713585'
)
on conflict (transaction_id, reason) do nothing;

do $block$
declare
  v_rental_archive_count integer;
  v_transaction_archive_count integer;
begin
  select count(*)
  into v_rental_archive_count
  from private.rental_closure_corrections_archive
  where rental_id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202'
    and reason = 'Remove Osmar QMK-0H63 closure manual week 6 reported on 2026-10-02';

  select count(*)
  into v_transaction_archive_count
  from private.transaction_corrections_archive
  where transaction_id in (
    'd6ea96a7-64ac-477c-bd19-0c55eb7fabde',
    '70b610bf-d808-4bac-b72b-a6101d06ce04',
    '353d1547-e830-454e-9d07-3a19fc713585'
  )
    and reason = 'Remove Osmar QMK-0H63 closure manual week 6 and reallocate deposit';

  if v_rental_archive_count <> 1 then
    raise exception 'Expected to archive the Osmar rental before correction, archived %', v_rental_archive_count;
  end if;

  if v_transaction_archive_count <> 3 then
    raise exception 'Expected to archive 3 Osmar closure transactions before correction, archived %', v_transaction_archive_count;
  end if;
end;
$block$;

with corrected_summary as (
  select
    r.id,
    r.documentos -> 'closureSummary' as summary,
    coalesce(
      jsonb_agg(
        case
          when cycle ->> 'labelRef' = 'Semana 2 (Ref: Proporcional de 6 dias - Adicional Manual)'
            then cycle || jsonb_build_object('displayWeekNumber', 7)
          else cycle
        end
        order by cycle_position
      ) filter (
        where cycle ->> 'labelRef' <> 'Semana 1 (Ref: Adicional Manual no Encerramento)'
      ),
      '[]'::jsonb
    ) as remaining_cycles
  from public.rentals as r
  cross join lateral jsonb_array_elements(
    coalesce(r.documentos #> '{closureSummary,unpaidCyclesList}', '[]'::jsonb)
  ) with ordinality as unpaid_cycle(cycle, cycle_position)
  where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202'
  group by r.id, r.documentos -> 'closureSummary'
)
update public.rentals as r
set documentos = jsonb_set(
  r.documentos,
  '{closureSummary}',
  s.summary || jsonb_build_object(
    'balance', 570.852857142857,
    'baseDebts', 1970.852857142857,
    'totalDebts', 1970.852857142857,
    'unpaidRentals', 582.1428571428571,
    'unpaidCyclesList', s.remaining_cycles,
    'rentalCalculationBreakdown',
      coalesce(s.summary -> 'rentalCalculationBreakdown', '{}'::jsonb)
        || jsonb_build_object(
          'total', 582.1428571428571,
          'weeks', 0,
          'days', 6,
          'tireTaxCycles', 1
        )
  ),
  true
)
from corrected_summary as s
where r.id = s.id;

delete from public.transactions
where id in (
  'd6ea96a7-64ac-477c-bd19-0c55eb7fabde',
  '70b610bf-d808-4bac-b72b-a6101d06ce04'
);

update public.transactions
set val = 692.1471428571429
where id = '353d1547-e830-454e-9d07-3a19fc713585';

do $block$
declare
  v_removed_transaction_count integer;
  v_vistoria_value numeric;
  v_week_2_paid numeric;
  v_week_2_interest numeric;
  v_removed_cycle_count integer;
  v_remaining_cycle_count integer;
  v_remaining_cycle_number integer;
  v_unpaid_rentals numeric;
  v_total_debts numeric;
  v_balance numeric;
begin
  select count(*)
  into v_removed_transaction_count
  from public.transactions
  where id in (
    'd6ea96a7-64ac-477c-bd19-0c55eb7fabde',
    '70b610bf-d808-4bac-b72b-a6101d06ce04'
  );

  select val
  into v_vistoria_value
  from public.transactions
  where id = '353d1547-e830-454e-9d07-3a19fc713585';

  select
    coalesce(sum(t.val) filter (
      where lower(btrim(t.cat)) in ('aluguel', 'taxa de pneus')
    ), 0),
    coalesce(sum(t.val) filter (
      where lower(btrim(t.cat)) = 'juros por atraso'
    ), 0)
  into v_week_2_paid, v_week_2_interest
  from public.transactions as t
  where upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) = 'QMK0H63'
    and t.date = date '2026-09-04'
    and t."desc" like '%OSMAR CESAR SOUZA DOS SANTOS BAHIA%'
    and t."desc" like '%Ref: 04/09/2026 a 10/09/2026%';

  select
    count(*) filter (
      where cycle ->> 'labelRef' = 'Semana 1 (Ref: Adicional Manual no Encerramento)'
    ),
    count(*) filter (
      where cycle ->> 'labelRef' = 'Semana 2 (Ref: Proporcional de 6 dias - Adicional Manual)'
    ),
    max((cycle ->> 'displayWeekNumber')::integer) filter (
      where cycle ->> 'labelRef' = 'Semana 2 (Ref: Proporcional de 6 dias - Adicional Manual)'
    )
  into v_removed_cycle_count, v_remaining_cycle_count, v_remaining_cycle_number
  from public.rentals as r
  cross join lateral jsonb_array_elements(
    coalesce(r.documentos #> '{closureSummary,unpaidCyclesList}', '[]'::jsonb)
  ) as unpaid_cycle(cycle)
  where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202';

  select
    (r.documentos #>> '{closureSummary,unpaidRentals}')::numeric,
    (r.documentos #>> '{closureSummary,totalDebts}')::numeric,
    (r.documentos #>> '{closureSummary,balance}')::numeric
  into v_unpaid_rentals, v_total_debts, v_balance
  from public.rentals as r
  where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202';

  if v_removed_transaction_count <> 0 then
    raise exception 'Osmar manual week 6 transactions were not removed';
  end if;

  if v_vistoria_value is null or abs(v_vistoria_value - 692.1471428571429) > 0.001 then
    raise exception 'Expected reallocated inspection deposit value 692.1471428571429, found %', v_vistoria_value;
  end if;

  if abs(v_week_2_paid - 675.00) > 0.001 or abs(v_week_2_interest - 69.07) > 0.001 then
    raise exception 'Osmar week 2 totals differ: paid %, interest %', v_week_2_paid, v_week_2_interest;
  end if;

  if v_removed_cycle_count <> 0 or v_remaining_cycle_count <> 1 or v_remaining_cycle_number <> 7 then
    raise exception 'Unexpected Osmar manual cycles after correction: removed %, remaining %, number %', v_removed_cycle_count, v_remaining_cycle_count, v_remaining_cycle_number;
  end if;

  if abs(v_unpaid_rentals - 582.1428571428571) > 0.001
    or abs(v_total_debts - 1970.852857142857) > 0.001
    or abs(v_balance - 570.852857142857) > 0.001 then
    raise exception 'Unexpected Osmar closure totals after correction: rentals %, debts %, balance %', v_unpaid_rentals, v_total_debts, v_balance;
  end if;
end;
$block$;

commit;
