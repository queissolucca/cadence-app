-- Cadence — Etapa 10, comparação de evolução ("antes e depois") do /v2.
--
-- NÃO reusa a tabela progress_snapshots (já existe desde 0004): aquela
-- serve o "antes e depois" do app antigo (app/CadenceApp.js +
-- app/api/snapshot/submit), que compara o snapshot mais antigo com o mais
-- recente e guarda em errors_then uma lista simples de {pattern}. Este
-- fluxo novo compara sempre contra o Dia 1 fixo (profiles.baseline_question
-- / baseline_answer, Etapa 1) e guarda uma análise anotada bem mais rica
-- (then_annotated/now_annotated/wins/message_pt). Formatos incompatíveis —
-- reusar a mesma tabela quebraria a leitura do app antigo.
create table public.before_after_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  then_answer text not null,
  now_answer text not null,
  analysis jsonb not null,
  created_at timestamptz not null default now()
);

create index before_after_checks_user_created_idx on public.before_after_checks (user_id, created_at desc);

alter table public.before_after_checks enable row level security;
create policy "own before_after_checks select" on public.before_after_checks
  for select using (user_id = auth.uid());
create policy "own before_after_checks insert" on public.before_after_checks
  for insert with check (user_id = auth.uid());
