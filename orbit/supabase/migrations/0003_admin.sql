-- ════════════════════════════════════════════════════════════════════
--  ORBIT — admin role
--  Admins are listed in public.admins. The table has RLS on and no
--  policies, so it is only reachable through the SECURITY DEFINER
--  functions below, which check the caller first.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'houssambelkasmi11@gmail.com'
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'active7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'notes', (select count(*) from public.notes),
      'sources', (select count(*) from public.sources),
      'assignments', (select count(*) from public.assignments),
      'conversations', (select count(*) from public.conversations),
      'messages', (select count(*) from public.messages),
      'flashcards', (select count(*) from public.flashcards),
      'focus_minutes', (select coalesce(sum(actual_seconds),0)/60 from public.study_sessions where kind = 'focus')
    ),
    'signups', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d) from (
        select date_trunc('day', created_at)::date d, count(*) n from auth.users
        where created_at > now() - interval '30 days' group by 1) s), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(u order by u->>'created_at' desc) from (
        select jsonb_build_object(
          'id', au.id, 'email', au.email, 'created_at', au.created_at, 'last_sign_in_at', au.last_sign_in_at,
          'admin', exists (select 1 from public.admins a where a.user_id = au.id),
          'notes', (select count(*) from public.notes x where x.user_id = au.id),
          'sources', (select count(*) from public.sources x where x.user_id = au.id),
          'assignments', (select count(*) from public.assignments x where x.user_id = au.id),
          'messages', (select count(*) from public.messages x where x.user_id = au.id)
        ) u from auth.users au) t), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.admin_set_admin(target uuid, make boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if target = auth.uid() and not make then raise exception 'you cannot remove your own admin role'; end if;
  if make then insert into public.admins (user_id) values (target) on conflict do nothing;
  else delete from public.admins where user_id = target; end if;
end $$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
