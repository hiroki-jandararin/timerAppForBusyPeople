create table if not exists public.routines (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_duration_sec integer,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists routines_user_id_updated_at_idx
  on public.routines (user_id, updated_at desc);

grant select, insert, update, delete on table public.routines to authenticated;

alter table public.routines enable row level security;

create policy "Users can read their own routines"
  on public.routines
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own routines"
  on public.routines
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own routines"
  on public.routines
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own routines"
  on public.routines
  for delete
  to authenticated
  using (auth.uid() = user_id);
