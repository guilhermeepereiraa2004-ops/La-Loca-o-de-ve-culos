create table public.investor_notices (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    message text not null,
    video_url text,
    target_type text not null default 'all',
    target_ids uuid[] default null,
    read_by uuid[] default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by text
);

-- Enable RLS
alter table public.investor_notices enable row level security;

-- Allow all operations (app-level auth)
create policy "Allow all operations for investor_notices"
    on public.investor_notices
    for all
    using (true)
    with check (true);

grant all on table public.investor_notices to anon, authenticated, service_role;

