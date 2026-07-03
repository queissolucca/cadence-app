-- Cadence v2 — Perfil de Erros (ledger com dedup por padrão), rubrica de 4
-- eixos, cadência semanal, trilhas/estágios e diagnóstico inicial.

-- ---------------------------------------------------------------------------
-- review_items vira o "Perfil de Erros": pattern (dedup) e skill de 1ª classe
-- ---------------------------------------------------------------------------
alter table public.review_items
  add column pattern text,
  add column skill text;

update public.review_items
set skill = coalesce(content ->> 'skill', 'writing')
where skill is null;

alter table public.review_items
  alter column skill set not null,
  add constraint review_items_skill_check check (skill in ('writing', 'speaking'));

-- Um padrão de erro só existe uma vez por usuário+skill — correções futuras
-- atualizam o item existente em vez de duplicar.
create unique index review_items_user_pattern_key
  on public.review_items (user_id, skill, pattern)
  where pattern is not null;

create index review_items_user_skill_idx on public.review_items (user_id, skill);

-- ---------------------------------------------------------------------------
-- exercise_attempts: rubrica, cumprimento da restrição e novo enum de veredito
-- ---------------------------------------------------------------------------
alter table public.exercise_attempts
  add column rubrica_delta jsonb,
  add column restricao_cumprida boolean;

-- Solta a constraint antiga ANTES de migrar os dados de teste (senão o
-- próprio update abaixo bate na trava antiga, que não conhece os novos valores).
alter table public.exercise_attempts drop constraint if exists exercise_attempts_verdict_check;

update public.exercise_attempts set verdict = 'correto' where verdict = 'good';
update public.exercise_attempts set verdict = 'nao_natural' where verdict = 'minor';
update public.exercise_attempts set verdict = 'erro' where verdict = 'rework';

alter table public.exercise_attempts add constraint exercise_attempts_verdict_check
  check (verdict in ('erro', 'nao_natural', 'correto'));

-- ---------------------------------------------------------------------------
-- skill_progress: eixos acumulados da rubrica (base das "patentes")
-- ---------------------------------------------------------------------------
alter table public.skill_progress
  add column precisao numeric not null default 0,
  add column naturalidade numeric not null default 0,
  add column vocabulario numeric not null default 0,
  add column fluencia numeric not null default 0;

-- ---------------------------------------------------------------------------
-- profiles: cadência semanal, trilha/estágio atual, status do diagnóstico
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column weekly_cadence_target smallint not null default 5,
  add constraint profiles_cadence_check check (weekly_cadence_target in (3, 5, 7)),
  add column current_track text,
  add column current_stage smallint not null default 0,
  add column diagnostic_completed boolean not null default false;

-- ---------------------------------------------------------------------------
-- stage_completions: registra "boss scenarios" vencidos (desbloqueia estágio)
-- ---------------------------------------------------------------------------
create table public.stage_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  track text not null,
  stage smallint not null,
  completed_at timestamptz not null default now(),
  unique (user_id, track, stage)
);

alter table public.stage_completions enable row level security;

create policy "own stage_completions" on public.stage_completions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
