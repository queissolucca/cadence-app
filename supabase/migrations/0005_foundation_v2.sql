-- Cadence — fundação v2 (streak com shields, catálogo de cenários,
-- histórico de erros bruto, sessões explícitas, cache de conteúdo diário,
-- roleplay persistido).
--
-- Isto é uma migration ADITIVA: nada aqui recria profiles/review_items/
-- exercise_attempts — esses já existem (0001-0004) e continuam sendo a
-- fonte de verdade dos conceitos equivalentes (review_items ~= "phrases",
-- exercise_attempts ~= "reviews", user_theme_selection ~= "extra_topics",
-- progress_snapshots ~= "baseline", correction_timing/depth já existem em
-- profiles). Só cria o que é genuinamente novo.

-- ---------------------------------------------------------------------------
-- scenarios — catálogo fixo (antes só existia como lib/tracks.js estático)
-- ---------------------------------------------------------------------------
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  stage int not null,
  prerequisite_id uuid references public.scenarios (id),
  target_phrases int not null default 20,
  skill_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;
create policy "scenarios are public read" on public.scenarios
  for select using (true);

-- ---------------------------------------------------------------------------
-- user_scenario_state — progresso agregado do usuário por cenário
-- ---------------------------------------------------------------------------
create table public.user_scenario_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  mastered_count int not null default 0,
  status text not null default 'locked' check (status in ('locked', 'current', 'done')),
  updated_at timestamptz not null default now(),
  primary key (user_id, scenario_id)
);

alter table public.user_scenario_state enable row level security;
create policy "own user_scenario_state" on public.user_scenario_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- review_items ganha um link opcional pro cenário do catálogo novo — não
-- substitui pattern/categoria, só permite agrupar por cenário quando fizer
-- sentido (ex: telas de progresso por cenário no futuro).
-- ---------------------------------------------------------------------------
alter table public.review_items
  add column scenario_id uuid references public.scenarios (id);

-- ---------------------------------------------------------------------------
-- error_events — log bruto de cada erro (timestamped), complementar ao
-- estado agregado que review_items já mantém. Serve pra analytics tipo
-- "onde você mais errou essa semana", que precisa de eventos no tempo, não
-- só do estado atual deduplicado por padrão.
-- ---------------------------------------------------------------------------
create table public.error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  category_label_pt text not null,
  detail_pt text,
  wrong_text text,
  right_text text,
  occurred_at timestamptz not null default now()
);

create index error_events_user_occurred_idx on public.error_events (user_id, occurred_at desc);

alter table public.error_events enable row level security;
create policy "own error_events" on public.error_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sessions — entidade explícita de sessão (início/fim/duração/acerto), pra
-- não depender só de inferir isso a partir de timestamps de exercise_attempts.
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('daily', 'weak_training', 'roleplay', 'baseline')),
  mode text check (mode in ('writing', 'speaking', 'mixed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int not null default 0,
  items_total int not null default 0,
  items_correct int not null default 0
);

create index sessions_user_started_idx on public.sessions (user_id, started_at desc);

alter table public.sessions enable row level security;
create policy "own sessions" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- daily_content — cache do conteúdo gerado por IA por usuário/dia, pra
-- garantir que nunca gera 2x no mesmo dia.
-- ---------------------------------------------------------------------------
create table public.daily_content (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  phrase_of_day jsonb,
  exercises jsonb,
  generated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_content enable row level security;
create policy "own daily_content" on public.daily_content
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- roleplay_sessions — persiste a conversa inteira (hoje o roleplay só salva
-- os erros finais em review_items; a transcrição em si era só estado de
-- React, perdida ao sair da tela).
-- ---------------------------------------------------------------------------
create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid references public.scenarios (id),
  mission_pt text not null,
  messages jsonb not null default '[]',
  turns_target int not null default 5,
  turns_done int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.roleplay_sessions enable row level security;
create policy "own roleplay_sessions" on public.roleplay_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profiles — streak incremental com shields (hoje o streak é 100% derivado
-- de exercise_attempts via lib/week.js; isso fica como camada adicional,
-- não substitui o cálculo atual) + preferências de sessão/voz/tema/lembrete.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column streak_count int not null default 0,
  add column streak_last_day date,
  add column streak_shields int not null default 0,
  add column session_duration int not null default 8 check (session_duration in (5, 8, 12)),
  add column voice_accent text not null default 'us' check (voice_accent in ('us', 'uk')),
  add column audio_speed numeric not null default 1.0 check (audio_speed in (0.75, 1.0)),
  add column pronunciation_strictness text not null default 'medium' check (pronunciation_strictness in ('low', 'medium', 'high')),
  add column theme text not null default 'light' check (theme in ('light', 'dark', 'auto')),
  add column reminder_enabled boolean not null default true,
  add column reminder_time time not null default '08:00',
  add column active_scenario_id uuid references public.scenarios (id);

-- ---------------------------------------------------------------------------
-- Seed: estágios 1-5 de "Inglês para trabalho"
-- ---------------------------------------------------------------------------
do $$
declare
  s1 uuid; s2 uuid; s3 uuid; s4 uuid;
begin
  insert into public.scenarios (title, subtitle, stage, skill_tags)
    values ('Apresentar-se no primeiro dia', 'Small talk, cargo, time', 1, '{small_talk,apresentacao}')
    returning id into s1;

  insert into public.scenarios (title, subtitle, stage, skill_tags)
    values ('Pedir ajuda a um colega', 'Pedidos educados, could you…', 2, '{pedidos_educados}')
    returning id into s2;

  insert into public.scenarios (title, subtitle, stage, prerequisite_id, skill_tags)
    values ('Reunião de status', 'Prazos, bloqueios, circle back', 3, s2, '{preposicoes_tempo,vocab_reuniao}')
    returning id into s3;

  insert into public.scenarios (title, subtitle, stage, prerequisite_id, skill_tags)
    values ('Negociar um prazo', 'Contrapropostas, condicionais', 4, s3, '{condicionais,preposicoes_tempo}')
    returning id into s4;

  insert into public.scenarios (title, subtitle, stage, prerequisite_id, skill_tags)
    values ('Entrevista de emprego', 'Pontos fortes, experiências, salário', 5, s4, '{past_tense,vocab_entrevista}');
end $$;
