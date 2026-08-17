create table public.oil_changes (
    id uuid default gen_random_uuid() primary key,
    vehicle_plate text not null,
    date text not null,
    km integer,
    next_km integer,
    value numeric,
    observations text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.oil_changes enable row level security;

-- Create policy to allow all access (since auth is handled at app level for now)
create policy "Allow all operations for oil_changes"
    on public.oil_changes
    for all
    using (true)
    with check (true);

grant all on table public.oil_changes to anon, authenticated, service_role;

