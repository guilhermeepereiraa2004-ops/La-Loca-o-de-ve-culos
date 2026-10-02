begin;

insert into private.rental_closure_corrections_archive (
  rental_id,
  reason,
  rental_data
)
select
  r.id,
  'Remove remaining Osmar QMK-0H63 manual week 7 reported on 2026-10-02',
  to_jsonb(r)
from public.rentals as r
where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202'
  and upper(btrim(r.user_name)) = 'OSMAR CESAR SOUZA DOS SANTOS BAHIA'
  and upper(regexp_replace(btrim(r.placa), '[^A-Za-z0-9]', '', 'g')) = 'QMK0H63'
  and r.status in ('Encerrado', 'Finalizado')
on conflict (rental_id, reason) do nothing;

insert into private.transaction_corrections_archive (
  transaction_id,
  reason,
  transaction_data
)
select
  t.id,
  'Remove remaining Osmar QMK-0H63 manual week 7 and recalculate deposit',
  to_jsonb(t)
from public.transactions as t
where t.id in (
  'e000365a-4c69-440a-9a42-872f375f4599',
  '5e28bfb4-4707-4c0a-a754-0ca52c0ad723',
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
    and reason = 'Remove remaining Osmar QMK-0H63 manual week 7 reported on 2026-10-02';

  select count(*)
  into v_transaction_archive_count
  from private.transaction_corrections_archive
  where transaction_id in (
    'e000365a-4c69-440a-9a42-872f375f4599',
    '5e28bfb4-4707-4c0a-a754-0ca52c0ad723',
    '353d1547-e830-454e-9d07-3a19fc713585'
  )
    and reason = 'Remove remaining Osmar QMK-0H63 manual week 7 and recalculate deposit';

  if v_rental_archive_count <> 1 then
    raise exception 'Expected to archive the Osmar rental before removing manual week 7, archived %', v_rental_archive_count;
  end if;

  if v_transaction_archive_count <> 3 then
    raise exception 'Expected to archive 3 Osmar transactions before removing manual week 7, archived %', v_transaction_archive_count;
  end if;
end;
$block$;

update public.rentals
set documentos = jsonb_set(
  documentos,
  '{closureSummary}',
  (documentos -> 'closureSummary') || jsonb_build_object(
    'type', 'return',
    'balance', 11.29,
    'baseDebts', 1388.71,
    'totalDebts', 1388.71,
    'unpaidRentals', 0,
    'unpaidCyclesList', '[]'::jsonb,
    'proratedDaysUsed', 0,
    'hasProratedAdjust', false,
    'rentalCalculationBreakdown',
      coalesce(documentos #> '{closureSummary,rentalCalculationBreakdown}', '{}'::jsonb)
        || jsonb_build_object(
          'isCustomized', false,
          'total', 0,
          'weeks', 0,
          'days', 0,
          'tireTaxCycles', 0
        )
  ),
  true
)
where id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202';

delete from public.transactions
where id in (
  'e000365a-4c69-440a-9a42-872f375f4599',
  '5e28bfb4-4707-4c0a-a754-0ca52c0ad723'
);

update public.transactions
set val = 1263
where id = '353d1547-e830-454e-9d07-3a19fc713585';

do $block$
declare
  v_removed_transaction_count integer;
  v_vistoria_value numeric;
  v_manual_cycle_count integer;
  v_unpaid_rentals numeric;
  v_total_debts numeric;
  v_balance numeric;
  v_closure_type text;
  v_week_5_paid numeric;
begin
  select count(*)
  into v_removed_transaction_count
  from public.transactions
  where id in (
    'e000365a-4c69-440a-9a42-872f375f4599',
    '5e28bfb4-4707-4c0a-a754-0ca52c0ad723'
  );

  select val
  into v_vistoria_value
  from public.transactions
  where id = '353d1547-e830-454e-9d07-3a19fc713585';

  select count(*)
  into v_manual_cycle_count
  from public.rentals as r
  cross join lateral jsonb_array_elements(
    coalesce(r.documentos #> '{closureSummary,unpaidCyclesList}', '[]'::jsonb)
  ) as unpaid_cycle(cycle)
  where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202';

  select
    (r.documentos #>> '{closureSummary,unpaidRentals}')::numeric,
    (r.documentos #>> '{closureSummary,totalDebts}')::numeric,
    (r.documentos #>> '{closureSummary,balance}')::numeric,
    r.documentos #>> '{closureSummary,type}'
  into v_unpaid_rentals, v_total_debts, v_balance, v_closure_type
  from public.rentals as r
  where r.id = 'ce5c3461-e7ab-4597-9674-ba17c38f7202';

  select coalesce(sum(t.val), 0)
  into v_week_5_paid
  from public.transactions as t
  where upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) = 'QMK0H63'
    and t.date = date '2026-09-25'
    and lower(btrim(t.cat)) in ('aluguel', 'taxa de pneus')
    and t."desc" like '%Ref: 25/09/2026 a 30/09/2026%';

  if v_removed_transaction_count <> 0 then
    raise exception 'Osmar manual week 7 transactions were not removed';
  end if;

  if v_vistoria_value is null or abs(v_vistoria_value - 1263) > 0.001 then
    raise exception 'Expected full inspection deposit allocation 1263, found %', v_vistoria_value;
  end if;

  if v_manual_cycle_count <> 0 then
    raise exception 'Expected no remaining Osmar closure cycles, found %', v_manual_cycle_count;
  end if;

  if abs(v_unpaid_rentals) > 0.001
    or abs(v_total_debts - 1388.71) > 0.001
    or abs(v_balance - 11.29) > 0.001
    or v_closure_type <> 'return' then
    raise exception 'Unexpected Osmar closure totals after removing week 7: rentals %, debts %, balance %, type %', v_unpaid_rentals, v_total_debts, v_balance, v_closure_type;
  end if;

  if abs(v_week_5_paid - 582.14) > 0.001 then
    raise exception 'Osmar week 5 paid total changed unexpectedly: %', v_week_5_paid;
  end if;
end;
$block$;

commit;
