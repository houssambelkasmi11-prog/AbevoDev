-- ════════════════════════════════════════════════════════════════════
--  ORBIT — calendar subscriptions (iCal / ICS feeds, e.g. MyTimetable)
--  A feed's events are copied into public.events with feed_id set, and
--  replaced on every sync. Deleting a feed deletes its events.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  url text not null,                -- encrypted with ORBIT_ENCRYPTION_KEY when available (the link is a private token)
  color text,
  last_synced_at timestamptz,
  last_error text,
  event_count int not null default 0
);
create index if not exists calendar_feeds_user_idx on public.calendar_feeds (user_id, workspace_id);

create trigger calendar_feeds_touch before update on public.calendar_feeds for each row execute function public.orbit_touch_updated_at();
alter table public.calendar_feeds enable row level security;
alter table public.calendar_feeds force row level security;
create policy calendar_feeds_select_own on public.calendar_feeds for select using (user_id = auth.uid());
create policy calendar_feeds_insert_own on public.calendar_feeds for insert with check (user_id = auth.uid());
create policy calendar_feeds_update_own on public.calendar_feeds for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calendar_feeds_delete_own on public.calendar_feeds for delete using (user_id = auth.uid());

alter table public.events add column if not exists feed_id uuid references public.calendar_feeds(id) on delete cascade;
alter table public.events add column if not exists location text;
alter table public.events add column if not exists external_uid text;
alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('study','deadline','exam','other','class'));
alter table public.events drop constraint if exists events_origin_check;
alter table public.events add constraint events_origin_check check (origin in ('student','ai','feed'));
create index if not exists events_feed_idx on public.events (feed_id);
