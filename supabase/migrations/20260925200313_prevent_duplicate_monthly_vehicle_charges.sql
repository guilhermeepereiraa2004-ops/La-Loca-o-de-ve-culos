begin;

-- Automatic monthly charges used to be created by every browser session. Keep
-- manual transactions nullable and give only automatic charges a stable key.
alter table public.transactions
  add column if not exists billing_key text;

comment on column public.transactions.billing_key is
  'Stable idempotency key for system-generated transactions. NULL for manual entries.';

-- Keep every removed duplicate recoverable and outside the exposed Data API.
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.monthly_vehicle_charge_duplicates_archive (
  transaction_id uuid primary key,
  canonical_transaction_id uuid not null,
  archived_at timestamp with time zone not null default now(),
  reason text not null,
  transaction_data jsonb not null
);

alter table private.monthly_vehicle_charge_duplicates_archive enable row level security;
revoke all on table private.monthly_vehicle_charge_duplicates_archive from public, anon, authenticated;

-- Archive and remove only rows in the categories/date pattern reserved for the
-- old automatic generator. The earliest row is the canonical one.
with recurring_charges as (
  select
    t.id,
    upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) as normalized_plate,
    case
      when lower(btrim(t.cat)) = lower('Proteção Veicular') then 'protection'
      when lower(btrim(t.cat)) = lower('Seguro Franquia') then 'franchise'
    end as billing_kind,
    date_trunc('month', t.date)::date as billing_period,
    row_number() over (
      partition by
        upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')),
        case
          when lower(btrim(t.cat)) = lower('Proteção Veicular') then 'protection'
          when lower(btrim(t.cat)) = lower('Seguro Franquia') then 'franchise'
        end,
        date_trunc('month', t.date)::date
      order by t.created_at asc nulls last, t.id asc
    ) as duplicate_rank,
    first_value(t.id) over (
      partition by
        upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')),
        case
          when lower(btrim(t.cat)) = lower('Proteção Veicular') then 'protection'
          when lower(btrim(t.cat)) = lower('Seguro Franquia') then 'franchise'
        end,
        date_trunc('month', t.date)::date
      order by t.created_at asc nulls last, t.id asc
    ) as canonical_transaction_id
  from public.transactions as t
  where t."type" = 'in'
    and t.date >= date '2026-06-01'
    and extract(day from t.date) = 10
    and nullif(btrim(t.vehicle_plate), '') is not null
    and (
      lower(btrim(t.cat)) = lower('Proteção Veicular')
      or lower(btrim(t.cat)) = lower('Seguro Franquia')
    )
)
insert into private.monthly_vehicle_charge_duplicates_archive (
  transaction_id,
  canonical_transaction_id,
  reason,
  transaction_data
)
select
  t.id,
  r.canonical_transaction_id,
  'Duplicate automatic monthly vehicle charge removed before enabling database idempotency',
  to_jsonb(t)
from recurring_charges as r
join public.transactions as t on t.id = r.id
where r.duplicate_rank > 1
on conflict (transaction_id) do nothing;

with recurring_charges as (
  select
    t.id,
    row_number() over (
      partition by
        upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')),
        case
          when lower(btrim(t.cat)) = lower('Proteção Veicular') then 'protection'
          when lower(btrim(t.cat)) = lower('Seguro Franquia') then 'franchise'
        end,
        date_trunc('month', t.date)::date
      order by t.created_at asc nulls last, t.id asc
    ) as duplicate_rank
  from public.transactions as t
  where t."type" = 'in'
    and t.date >= date '2026-06-01'
    and extract(day from t.date) = 10
    and nullif(btrim(t.vehicle_plate), '') is not null
    and (
      lower(btrim(t.cat)) = lower('Proteção Veicular')
      or lower(btrim(t.cat)) = lower('Seguro Franquia')
    )
)
delete from public.transactions as t
using recurring_charges as r
where t.id = r.id
  and r.duplicate_rank > 1;

-- Backfill the surviving automatic charges. Vehicle UUID makes the key stable
-- even if a plate or model is edited later. The plate fallback covers deleted
-- historical vehicles, which can no longer generate a future charge.
with recurring_charges as (
  select
    t.id,
    upper(regexp_replace(btrim(t.vehicle_plate), '[^A-Za-z0-9]', '', 'g')) as normalized_plate,
    case
      when lower(btrim(t.cat)) = lower('Proteção Veicular') then 'protection'
      when lower(btrim(t.cat)) = lower('Seguro Franquia') then 'franchise'
    end as billing_kind,
    date_trunc('month', t.date)::date as billing_period
  from public.transactions as t
  where t."type" = 'in'
    and t.date >= date '2026-06-01'
    and extract(day from t.date) = 10
    and nullif(btrim(t.vehicle_plate), '') is not null
    and (
      lower(btrim(t.cat)) = lower('Proteção Veicular')
      or lower(btrim(t.cat)) = lower('Seguro Franquia')
    )
), resolved_charges as (
  select
    r.id,
    r.billing_kind,
    r.billing_period,
    coalesce(
      (
        select v.id::text
        from public.vehicles as v
        where upper(regexp_replace(btrim(v.plate), '[^A-Za-z0-9]', '', 'g')) = r.normalized_plate
        order by
          (lower(v.plate) like '%(antigo)%') asc,
          v.created_at desc nulls last,
          v.id asc
        limit 1
      ),
      'plate-' || r.normalized_plate
    ) as vehicle_identity
  from recurring_charges as r
)
update public.transactions as t
set billing_key = concat(
  'monthly_vehicle_charge:',
  r.vehicle_identity,
  ':',
  r.billing_kind,
  ':',
  to_char(r.billing_period, 'YYYY-MM')
)
from resolved_charges as r
where t.id = r.id;

-- PostgreSQL unique indexes allow multiple NULL values, so manual entries stay
-- unrestricted while every automatic key is enforced atomically.
create unique index if not exists transactions_billing_key_uidx
  on public.transactions (billing_key);

-- The browser uses the anon role for its existing CRUD operations. It may edit
-- ordinary fields, but it must never forge or alter an automatic billing key.
create or replace function private.guard_transaction_billing_key()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.billing_key is not null then
        raise exception 'Automatic billing keys can only be created by the database scheduler.';
      end if;

      -- Old cached deployments do not send billing_key. Reject their reserved
      -- payload shape so they cannot bypass the unique index with a NULL key.
      if new."type" = 'in'
         and nullif(btrim(new.vehicle_plate), '') is not null
         and extract(day from new.date) = 10
         and (
           lower(btrim(new.cat)) = lower('Proteção Veicular')
           or lower(btrim(new.cat)) = lower('Seguro Franquia')
         ) then
        raise exception 'Monthly vehicle charges can only be created by the database scheduler.';
      end if;
    end if;

    if tg_op = 'UPDATE' then
      if new.billing_key is distinct from old.billing_key then
        raise exception 'Automatic billing keys cannot be changed by client sessions.';
      end if;

      if new.billing_key is null
         and new."type" = 'in'
         and nullif(btrim(new.vehicle_plate), '') is not null
         and extract(day from new.date) = 10
         and (
           lower(btrim(new.cat)) = lower('Proteção Veicular')
           or lower(btrim(new.cat)) = lower('Seguro Franquia')
         ) then
        raise exception 'Monthly vehicle charges can only be managed by the database scheduler.';
      end if;

      if old.billing_key is not null and (
        new.vehicle_plate is distinct from old.vehicle_plate
        or new.cat is distinct from old.cat
        or new.date is distinct from old.date
      ) then
        raise exception 'Vehicle, category, and competence are immutable for automatic charges.';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_transaction_billing_key() from public, anon, authenticated;

drop trigger if exists guard_transaction_billing_key on public.transactions;
create trigger guard_transaction_billing_key
before insert or update on public.transactions
for each row execute function private.guard_transaction_billing_key();

-- One database-owned generator replaces every browser acting as a scheduler.
-- The date parameter exists for deterministic regression tests; the cron call
-- uses Bahia local time.
create or replace function private.generate_monthly_vehicle_charges(
  p_as_of_date date default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_as_of_date date;
  v_billing_period date;
  v_due_date date;
  v_inserted_count integer := 0;
begin
  v_as_of_date := coalesce(
    p_as_of_date,
    (current_timestamp at time zone 'America/Bahia')::date
  );

  -- September has already been financially closed by the legacy generator.
  -- Start the centralized flow on the next untouched competence so deploying
  -- this fix cannot create retroactive charges in the current month.
  if v_as_of_date < date '2026-10-10'
     or extract(day from v_as_of_date) < 10 then
    return 0;
  end if;

  v_billing_period := date_trunc('month', v_as_of_date)::date;
  v_due_date := (v_billing_period + interval '9 days')::date;

  -- Avoid duplicate work between a manual maintenance run and the cron job.
  -- The unique index remains the final concurrency guarantee.
  perform pg_catalog.pg_advisory_xact_lock(2026092501::bigint);

  with eligible_vehicles as (
    select
      v.id,
      v.model,
      v.plate,
      v.has_protection,
      v.protection_value,
      v.franchise_insurance,
      coalesce(
        v.entry_date,
        (v.created_at at time zone 'America/Bahia')::date
      ) as effective_entry_date,
      case
        when i.name is null
          or nullif(btrim(i.name), '') is null
          or lower(btrim(i.name)) in ('interno', 'nenhum')
          then 'Administradora'
        else 'Investidor: ' || i.name
      end as responsible
    from public.vehicles as v
    left join public.investors as i on i.id = v.investor_id
    where nullif(btrim(v.plate), '') is not null
      and lower(v.plate) not like '%(antigo)%'
  ), charges as (
    select
      'in'::text as "type",
      v.protection_value::numeric as val,
      'Proteção Veicular'::text as cat,
      concat('Proteção Veicular - ', v.model, ' (', v.plate, ')') as "desc",
      v_due_date as date,
      v.plate as vehicle_plate,
      v.responsible,
      'Concluído'::text as status,
      concat(
        'monthly_vehicle_charge:',
        v.id::text,
        ':protection:',
        to_char(v_billing_period, 'YYYY-MM')
      ) as billing_key
    from eligible_vehicles as v
    where v.has_protection is true
      and coalesce(v.protection_value, 0) > 0
      and (v.effective_entry_date is null or v.effective_entry_date < v_due_date)

    union all

    select
      'in'::text,
      39.90::numeric,
      'Seguro Franquia'::text,
      concat('Seguro Franquia - ', v.model, ' (', v.plate, ')'),
      v_due_date,
      v.plate,
      v.responsible,
      'Concluído'::text,
      concat(
        'monthly_vehicle_charge:',
        v.id::text,
        ':franchise:',
        to_char(v_billing_period, 'YYYY-MM')
      )
    from eligible_vehicles as v
    where v.franchise_insurance is true
      and (v.effective_entry_date is null or v.effective_entry_date < v_due_date)
  )
  insert into public.transactions (
    "type",
    val,
    cat,
    "desc",
    date,
    vehicle_plate,
    responsible,
    status,
    billing_key
  )
  select
    c."type",
    c.val,
    c.cat,
    c."desc",
    c.date,
    c.vehicle_plate,
    c.responsible,
    c.status,
    c.billing_key
  from charges as c
  on conflict (billing_key) do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$function$;

comment on function private.generate_monthly_vehicle_charges(date) is
  'Creates idempotent protection and franchise charges for one Bahia-local billing competence.';

-- Functions receive PUBLIC execute by default; keep both helpers internal.
revoke all on function private.generate_monthly_vehicle_charges(date) from public, anon, authenticated;
grant execute on function private.generate_monthly_vehicle_charges(date) to postgres;

-- Supabase Cron uses UTC/GMT. 06:05 UTC is 03:05 in Bahia; the function itself
-- still derives and validates the local date. Running daily gives automatic
-- retry after day 10, while the unique key makes every retry harmless.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'generate-monthly-vehicle-charges',
  '5 6 * * *',
  $job$select private.generate_monthly_vehicle_charges();$job$
);

commit;
