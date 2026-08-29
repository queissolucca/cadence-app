-- Progresso da trilha: uma linha por (usuário, unidade concluída). Uma unidade
-- conta como feita quando a lição roda por >=30s. `times` = quantas vezes.
create table public.unit_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  unit_id text not null,
  times int not null default 1,
  completed_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

alter table public.unit_progress enable row level security;

create policy "own unit_progress select" on public.unit_progress
  for select using (user_id = auth.uid());

create policy "own unit_progress insert" on public.unit_progress
  for insert with check (user_id = auth.uid());

create policy "own unit_progress update" on public.unit_progress
  for update using (user_id = auth.uid());
