-- Cadence — feedback nomeado, temas, antes/depois e recuperação ativa.
-- Mapa de progresso por tópico é derivado ao vivo de review_items.content
-- ->>'categoria' — não cria skill_topics/user_topic_progress à parte pra
-- evitar duas fontes de verdade pro mesmo dado. situational_themes também
-- não vira tabela: os temas continuam estáticos em lib/tracks.js (custo/
-- latência), só a seleção do usuário é persistida abaixo.

-- ---------------------------------------------------------------------------
-- mastery_events — feedback nomeado, disparado só na transição active→mastered
-- ---------------------------------------------------------------------------
create table public.mastery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_item_id uuid references public.review_items (id) on delete set null,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create index mastery_events_user_created_idx on public.mastery_events (user_id, created_at desc);

alter table public.mastery_events enable row level security;
create policy "own mastery_events" on public.mastery_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- progress_snapshots — antes/depois tangível (§7)
-- ---------------------------------------------------------------------------
create table public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  response_text text not null,
  errors_then jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index progress_snapshots_user_created_idx on public.progress_snapshots (user_id, created_at desc);

alter table public.progress_snapshots enable row level security;
create policy "own progress_snapshots" on public.progress_snapshots
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- recall_reflections — log da recuperação ativa (§8), nunca afeta mastery
-- ---------------------------------------------------------------------------
create table public.recall_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_item_id uuid references public.review_items (id) on delete set null,
  user_guess text not null,
  created_at timestamptz not null default now()
);

alter table public.recall_reflections enable row level security;
create policy "own recall_reflections" on public.recall_reflections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_theme_selection — 2-3 temas priorizados pelo usuário (§2.2). track_id
-- referencia os ids estáticos de lib/tracks.js (sem FK, tema não é linha de
-- banco). O current_track do profile continua sendo o tema "principal" com
-- progressão de estágio/boss; os temas aqui só ampliam o pool de cenários
-- novos em composeSession.
-- ---------------------------------------------------------------------------
create table public.user_theme_selection (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  priority smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.user_theme_selection enable row level security;
create policy "own user_theme_selection" on public.user_theme_selection
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- review_items: origem do erro (exercício padrão vs roleplay, §6)
-- ---------------------------------------------------------------------------
alter table public.review_items
  add column origin text not null default 'exercise' check (origin in ('exercise', 'roleplay'));

-- ---------------------------------------------------------------------------
-- profiles: preferências de estilo de correção (§5)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column correction_timing text not null default 'inline' check (correction_timing in ('inline', 'end_of_exercise')),
  add column correction_depth text not null default 'explain_always' check (correction_depth in ('explain_always', 'flag_only'));
