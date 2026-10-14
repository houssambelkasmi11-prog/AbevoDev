-- ════════════════════════════════════════════════════════════════════
--  ORBIT — initial schema
--  Postgres + Supabase Auth + Storage + pgvector, with row-level security
--  on every table: a user can only ever read or write their own rows.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Shared trigger to maintain updated_at
create or replace function public.orbit_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Helper macro-ish: every table has these columns
--   id uuid pk, user_id uuid (owner), created_at, updated_at

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  language text not null default 'English',
  daily_goal_minutes int not null default 120,
  focus_minutes int not null default 25,
  break_minutes int not null default 5,
  long_break_minutes int not null default 15,
  notifications boolean not null default false,
  default_persona_id uuid,
  active_workspace_id uuid,
  embeddings_credential_id uuid,
  unique (user_id)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text,
  description text,
  glyph int not null default 0
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null default 'Untitled',
  content text not null default '',
  plain text not null default '',
  folder text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  word_count int not null default 0
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('pdf','docx','text','markdown','image','url','youtube','transcript','summary')),
  status text not null default 'queued' check (status in ('queued','processing','ready','failed','needs_input')),
  status_detail text,
  progress int not null default 0,
  url text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  page_count int,
  text text,
  outline jsonb not null default '[]',
  summary text,
  summary_model text,
  collection text,
  pinned boolean not null default false
);

create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_id uuid not null references public.sources(id) on delete cascade,
  ord int not null,
  content text not null,
  page int,
  heading text,
  token_count int not null default 0,
  embedding vector(1536)
);

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name text not null,
  role text not null,
  tagline text not null default '',
  teaching_style text not null default '',
  instructions text not null default '',
  credential_id uuid,
  model text,
  temperature real,
  depth text not null default 'standard' check (depth in ('brief','standard','deep')),
  length text not null default 'medium' check (length in ('short','medium','long')),
  language text not null default 'English',
  source_collections text[] not null default '{}',
  builtin boolean not null default false,
  glyph int not null default 0
);

-- Encrypted provider keys. key_ciphertext is AES-256-GCM, encrypted with a
-- server-held key (ORBIT_ENCRYPTION_KEY) and never selectable by the browser
-- because all access goes through authenticated server routes.
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text not null check (provider in ('openai','anthropic','gemini','openrouter','deepseek','custom')),
  label text not null,
  base_url text,
  key_ciphertext text not null,
  key_hint text not null,
  status text not null default 'untested' check (status in ('untested','connected','error')),
  status_detail text,
  default_model text,
  models_cache jsonb not null default '[]',
  last_tested_at timestamptz
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null default 'New conversation',
  persona_id uuid references public.personas(id) on delete set null,
  credential_id uuid references public.credentials(id) on delete set null,
  model text,
  mode text not null default 'detailed',
  scope jsonb not null default '{"subjectIds":[],"sourceIds":[],"noteIds":[],"collections":[]}',
  grounded boolean not null default false,
  pinned boolean not null default false
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null default '',
  persona_name text,
  model text,
  provider text,
  citations jsonb not null default '[]',
  grounding text not null default 'none',
  error text
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  prompt_text text not null default '',
  attachment_source_ids text[] not null default '{}',
  linked_note_ids text[] not null default '{}',
  selected_source_ids text[] not null default '{}',
  mode text not null default 'guide' check (mode in ('guide','solve','research','automate','review')),
  status text not null default 'planning' check (status in ('planning','in_progress','review','complete')),
  due_at timestamptz,
  requirements jsonb,
  stages jsonb not null default '{"input":"idle","analysis":"idle","sources":"idle","generation":"idle","review":"idle","export":"idle"}',
  ai_output text,
  ai_output_model text,
  student_work text not null default '',
  review jsonb not null default '[]',
  guide_log jsonb not null default '[]'
);

create table public.assignment_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  ord int not null default 0,
  title text not null,
  detail text,
  done boolean not null default false,
  estimate_minutes int,
  scheduled_at timestamptz,
  origin text not null default 'student' check (origin in ('student','ai'))
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  deck text not null default 'General',
  front text not null,
  back text not null,
  source_ref jsonb,
  ease real not null default 2.5,
  interval_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam boolean not null default false,
  time_limit_minutes int,
  questions jsonb not null default '[]',
  model text
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  answers jsonb not null default '[]',
  score real not null default 0,
  duration_seconds int not null default 0
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  label text not null,
  kind text not null default 'focus' check (kind in ('focus','break')),
  planned_seconds int not null,
  actual_seconds int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed_note text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  kind text not null default 'study' check (kind in ('study','deadline','exam','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  subject_id uuid references public.subjects(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete cascade,
  done boolean not null default false,
  origin text not null default 'student' check (origin in ('student','ai'))
);

create table public.graph_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('subject','note','source','conversation','assignment','concept')),
  entity_id uuid not null,
  label text,
  x real not null default 0,
  y real not null default 0
);

create table public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  kind text not null check (kind in ('belongs_to','references','builds_upon','related','prerequisite')),
  origin text not null default 'user' check (origin in ('user','ai')),
  status text not null default 'approved' check (status in ('approved','suggested','rejected')),
  rationale text
);

-- ─────────────── Indexes ───────────────
create index on public.subjects (user_id, workspace_id);
create index on public.notes (user_id, workspace_id, updated_at desc);
create index on public.sources (user_id, workspace_id, updated_at desc);
create index on public.source_chunks (source_id, ord);
create index on public.source_chunks using hnsw (embedding vector_cosine_ops);
create index on public.conversations (user_id, workspace_id, updated_at desc);
create index on public.messages (conversation_id, created_at);
create index on public.assignments (user_id, workspace_id);
create index on public.assignment_steps (assignment_id, ord);
create index on public.flashcards (user_id, workspace_id, due_at);
create index on public.quiz_attempts (quiz_id);
create index on public.study_sessions (user_id, workspace_id, started_at desc);
create index on public.events (user_id, workspace_id, starts_at);
create index on public.graph_nodes (workspace_id, entity_id);
create index on public.graph_edges (workspace_id, from_id);
create index on public.graph_edges (workspace_id, to_id);

-- ─────────────── updated_at triggers + RLS ───────────────
do $$
declare t text;
begin
  foreach t in array array[
    'settings','workspaces','subjects','notes','sources','source_chunks','personas','credentials',
    'conversations','messages','assignments','assignment_steps','flashcards','quizzes','quiz_attempts',
    'study_sessions','events','graph_nodes','graph_edges'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.orbit_touch_updated_at()', t || '_touch', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_delete_own', t);
  end loop;
end $$;

-- Prevent moving child rows under another user's parent (defence in depth).
create or replace function public.orbit_assert_same_owner() returns trigger
language plpgsql security invoker as $$
declare parent_owner uuid;
begin
  if tg_table_name = 'source_chunks' then
    select user_id into parent_owner from public.sources where id = new.source_id;
  elsif tg_table_name = 'messages' then
    select user_id into parent_owner from public.conversations where id = new.conversation_id;
  elsif tg_table_name = 'assignment_steps' then
    select user_id into parent_owner from public.assignments where id = new.assignment_id;
  elsif tg_table_name = 'quiz_attempts' then
    select user_id into parent_owner from public.quizzes where id = new.quiz_id;
  end if;
  if parent_owner is distinct from new.user_id then
    raise exception 'parent row belongs to another user';
  end if;
  return new;
end $$;

create trigger source_chunks_owner before insert or update on public.source_chunks for each row execute function public.orbit_assert_same_owner();
create trigger messages_owner before insert or update on public.messages for each row execute function public.orbit_assert_same_owner();
create trigger assignment_steps_owner before insert or update on public.assignment_steps for each row execute function public.orbit_assert_same_owner();
create trigger quiz_attempts_owner before insert or update on public.quiz_attempts for each row execute function public.orbit_assert_same_owner();

-- ─────────────── Semantic search (pgvector) ───────────────
-- security invoker → RLS still applies to the caller.
create or replace function public.match_source_chunks(
  query_embedding vector(1536),
  match_count int default 12,
  filter_source_ids uuid[] default null
) returns table (
  id uuid, user_id uuid, created_at timestamptz, updated_at timestamptz,
  source_id uuid, ord int, content text, page int, heading text, token_count int,
  similarity float
)
language sql stable security invoker as $$
  select c.id, c.user_id, c.created_at, c.updated_at, c.source_id, c.ord, c.content, c.page, c.heading, c.token_count,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.source_chunks c
  where c.embedding is not null
    and c.user_id = auth.uid()
    and (filter_source_ids is null or c.source_id = any(filter_source_ids))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────── Account deletion ───────────────
-- Lets a signed-in user delete their own auth user (cascades all rows).
create or replace function public.delete_own_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ─────────────── Private storage ───────────────
insert into storage.buckets (id, name, public)
values ('sources', 'sources', false)
on conflict (id) do nothing;

create policy "orbit_storage_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "orbit_storage_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "orbit_storage_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "orbit_storage_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = auth.uid()::text);
