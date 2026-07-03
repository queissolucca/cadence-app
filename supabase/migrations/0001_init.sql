-- Cadence — schema inicial
-- Perfis, progresso por habilidade (CEFR), histórico de exercícios e SRS (0/1/7/30 dias).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- skill_progress — nível CEFR estimado por habilidade
-- ---------------------------------------------------------------------------
create table public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  cefr_level text not null default 'A1' check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  total_attempts int not null default 0,
  correct_streak int not null default 0,
  last_attempt_at timestamptz,
  leveled_up_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, skill)
);

-- ---------------------------------------------------------------------------
-- review_items — itens do SRS (vocabulário, gramática, erros recorrentes)
-- ---------------------------------------------------------------------------
create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('vocab', 'grammar', 'error')),
  content jsonb not null,               -- { target, correction, context, note }
  stage smallint not null default 0 check (stage between 0 and 3),  -- 0=hoje,1=+1d,2=+7d,3=+30d
  next_review_at timestamptz not null default now(),
  mastered boolean not null default false,
  mastered_at timestamptz,
  times_seen int not null default 0,
  times_correct int not null default 0,
  last_resurfaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exercise_attempts — histórico de todo exercício feito (novo ou revisão)
-- ---------------------------------------------------------------------------
create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  task_type text not null,              -- 'ppp_practice' | 'tblt_task' | 'review'
  cefr_level_at_attempt text,
  task jsonb not null,                  -- cenário/tarefa apresentada
  user_input text not null,             -- texto ou transcript de fala
  feedback jsonb,                       -- { verdict, natural, why, tip, learningPoint, criteria }
  verdict text check (verdict in ('good', 'minor', 'rework')),
  review_item_id uuid references public.review_items (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- review_events — log de cada revisão (auditoria + métricas de progresso)
-- ---------------------------------------------------------------------------
create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references public.review_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  result text not null check (result in ('correct', 'incorrect')),
  stage_before smallint not null,
  stage_after smallint not null,
  reviewed_at timestamptz not null default now()
);

create index review_items_due_idx on public.review_items (user_id, next_review_at) where mastered = false;
create index exercise_attempts_user_created_idx on public.exercise_attempts (user_id, created_at desc);
create index review_events_item_idx on public.review_events (review_item_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — cada usuário só acessa os próprios dados
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.skill_progress enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.review_items enable row level security;
alter table public.review_events enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own skill_progress" on public.skill_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own exercise_attempts" on public.exercise_attempts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own review_items" on public.review_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own review_events" on public.review_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
