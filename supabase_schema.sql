-- Run in Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.guild_leagues (
  id uuid primary key default gen_random_uuid(),
  guild_a text not null,
  guild_b text not null,
  match_date date not null,
  round_no integer not null check (round_no > 0),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists guild_leagues_match_date_idx on public.guild_leagues(match_date desc);

create table if not exists public.personal_records (
  id bigserial primary key,
  league_id uuid not null references public.guild_leagues(id) on delete cascade,
  guild_name text not null,
  total_players_in_guild integer not null default 0,
  player_name text not null,
  class_name text not null,
  kills integer not null default 0,
  assists integer not null default 0,
  resources integer not null default 0,
  damage_to_players bigint not null default 0,
  damage_to_buildings bigint not null default 0,
  healing bigint not null default 0,
  damage_taken bigint not null default 0,
  serious_injuries integer not null default 0,
  feather_spring integer not null default 0,
  burning_bone integer not null default 0,
  source_file_name text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists personal_records_league_id_idx on public.personal_records(league_id);
create index if not exists personal_records_player_name_idx on public.personal_records(player_name);

alter table public.guild_leagues enable row level security;
alter table public.personal_records enable row level security;

-- Authenticated users can read/write their own rows.
create policy if not exists guild_leagues_select_own
on public.guild_leagues
for select
to authenticated
using (created_by = auth.uid());

create policy if not exists guild_leagues_insert_own
on public.guild_leagues
for insert
to authenticated
with check (created_by = auth.uid());

create policy if not exists guild_leagues_update_own
on public.guild_leagues
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy if not exists guild_leagues_delete_own
on public.guild_leagues
for delete
to authenticated
using (created_by = auth.uid());

create policy if not exists personal_records_select_own
on public.personal_records
for select
to authenticated
using (created_by = auth.uid());

create policy if not exists personal_records_insert_own
on public.personal_records
for insert
to authenticated
with check (created_by = auth.uid());

create policy if not exists personal_records_update_own
on public.personal_records
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy if not exists personal_records_delete_own
on public.personal_records
for delete
to authenticated
using (created_by = auth.uid());
