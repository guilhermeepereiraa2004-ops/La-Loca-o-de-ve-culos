begin;

-- A confirmation can be retried by the browser while the first request is
-- still in flight. Each line of one confirmation now has a stable key, so a
-- retry is harmless while ordinary/manual transaction rows may remain NULL.
alter table public.transactions
  add column if not exists operation_key text;

comment on column public.transactions.operation_key is
  'Idempotency key for a transaction created as part of one application operation.';

create unique index if not exists transactions_operation_key_uidx
  on public.transactions (operation_key);

-- Preserve every corrected row outside the exposed Data API before removal.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.rental_payment_duplicates_archive (
  transaction_id uuid primary key,
  archived_at timestamp with time zone not null default now(),
  reason text not null,
  transaction_data jsonb not null
);

alter table private.rental_payment_duplicates_archive enable row level security;
revoke all on table private.rental_payment_duplicates_archive from public, anon, authenticated;

with duplicate_batches(normalized_plate, cycle_date, duplicate_created_at) as (
  values
    ('SOV3G05', date '2026-09-21', timestamptz '2026-10-01 19:33:40.517344-03'),
    ('PCP9A02', date '2026-09-28', timestamptz '2026-10-01 19:33:57.036087-03'),
    ('EXR4F72', date '2026-09-28', timestamptz '2026-10-01 19:34:30.920511-03'),
    ('STK3J46', date '2026-09-28', timestamptz '2026-10-01 19:39:45.832794-03'),
    ('RPB3F93', date '2026-09-28', timestamptz '2026-10-01 19:41:32.286383-03'),
    ('QMN8G86', date '2026-09-18', timestamptz '2026-10-01 19:45:16.992505-03'),
    ('QMN8G86', date '2026-09-25', timestamptz '2026-10-01 19:27:14.089736-03'),
    ('QMC2F80', date '2026-09-18', timestamptz '2026-10-01 19:50:41.215515-03'),
    ('QMC2F80', date '2026-09-25', timestamptz '2026-10-01 19:50:50.028534-03'),
    ('PLR0B48', date '2026-09-21', timestamptz '2026-10-01 19:52:33.776214-03')
), matched_duplicates as (
  select t.*
  from public.transactions as t
  join duplicate_batches as d
    on upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) = d.normalized_plate
   and t.date = d.cycle_date
   and t.created_at = d.duplicate_created_at
)
insert into private.rental_payment_duplicates_archive (
  transaction_id,
  reason,
  transaction_data
)
select
  t.id,
  'Duplicated rental payment batch reported on 2026-10-02',
  to_jsonb(t)
from matched_duplicates as t
on conflict (transaction_id) do nothing;

do $block$
declare
  v_archived_count integer;
begin
  select count(*)
  into v_archived_count
  from private.rental_payment_duplicates_archive
  where reason = 'Duplicated rental payment batch reported on 2026-10-02';

  if v_archived_count <> 34 then
    raise exception 'Expected to archive 34 duplicated rental-payment rows, archived %', v_archived_count;
  end if;
end;
$block$;

with duplicate_batches(normalized_plate, cycle_date, duplicate_created_at) as (
  values
    ('SOV3G05', date '2026-09-21', timestamptz '2026-10-01 19:33:40.517344-03'),
    ('PCP9A02', date '2026-09-28', timestamptz '2026-10-01 19:33:57.036087-03'),
    ('EXR4F72', date '2026-09-28', timestamptz '2026-10-01 19:34:30.920511-03'),
    ('STK3J46', date '2026-09-28', timestamptz '2026-10-01 19:39:45.832794-03'),
    ('RPB3F93', date '2026-09-28', timestamptz '2026-10-01 19:41:32.286383-03'),
    ('QMN8G86', date '2026-09-18', timestamptz '2026-10-01 19:45:16.992505-03'),
    ('QMN8G86', date '2026-09-25', timestamptz '2026-10-01 19:27:14.089736-03'),
    ('QMC2F80', date '2026-09-18', timestamptz '2026-10-01 19:50:41.215515-03'),
    ('QMC2F80', date '2026-09-25', timestamptz '2026-10-01 19:50:50.028534-03'),
    ('PLR0B48', date '2026-09-21', timestamptz '2026-10-01 19:52:33.776214-03')
)
delete from public.transactions as t
using duplicate_batches as d
where upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) = d.normalized_plate
  and t.date = d.cycle_date
  and t.created_at = d.duplicate_created_at;

-- Abort and roll back the entire repair if any displayed billing total would
-- differ from the values supplied by the administrator.
do $block$
declare
  v_failures text;
begin
  with expected(normalized_plate, cycle_date, ref_start, paid_value, interest_value) as (
    values
      ('SOV3G05', date '2026-09-21', '21/09/2026', 625.00::numeric, 63.12::numeric),
      ('PCP9A02', date '2026-09-28', '28/09/2026', 575.00::numeric, 0.00::numeric),
      ('EXR4F72', date '2026-09-28', '28/09/2026', 600.00::numeric, 0.00::numeric),
      ('STK3J46', date '2026-09-28', '28/09/2026', 600.00::numeric, 0.00::numeric),
      ('RPB3F93', date '2026-09-28', '28/09/2026', 775.00::numeric, 78.01::numeric),
      ('QMN8G86', date '2026-09-18', '18/09/2026', 600.00::numeric, 61.40::numeric),
      ('QMN8G86', date '2026-09-25', '25/09/2026', 600.00::numeric, 61.20::numeric),
      ('QMC2F80', date '2026-09-18', '18/09/2026', 625.00::numeric, 0.00::numeric),
      ('QMC2F80', date '2026-09-25', '25/09/2026', 625.00::numeric, 0.00::numeric),
      ('PLR0B48', date '2026-09-21', '21/09/2026', 575.00::numeric, 59.03::numeric)
  ), actual as (
    select
      e.normalized_plate,
      e.cycle_date,
      e.paid_value,
      e.interest_value,
      coalesce(sum(t.val) filter (
        where lower(btrim(t.cat)) in ('aluguel', 'taxa de pneus')
      ), 0) as actual_paid,
      coalesce(sum(t.val) filter (
        where lower(btrim(t.cat)) = 'juros por atraso'
      ), 0) as actual_interest
    from expected as e
    left join public.transactions as t
      on upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) = e.normalized_plate
     and t.date = e.cycle_date
     and t."desc" like '%Ref: ' || e.ref_start || '%'
    group by e.normalized_plate, e.cycle_date, e.paid_value, e.interest_value
  )
  select string_agg(
    format(
      '%s %s (paid %s/%s, interest %s/%s)',
      normalized_plate,
      cycle_date,
      actual_paid,
      paid_value,
      actual_interest,
      interest_value
    ),
    '; '
  )
  into v_failures
  from actual
  where round(actual_paid, 2) <> paid_value
     or round(actual_interest, 2) <> interest_value;

  if v_failures is not null then
    raise exception 'Rental-payment repair verification failed: %', v_failures;
  end if;
end;
$block$;

commit;
