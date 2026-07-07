-- Cadence — "Enviar feedback" (aba Ajustes > Ajuda). Só o essencial: o
-- usuário manda um texto, sem e-mail externo por ora.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Usuário só lê o que ele mesmo enviou; insert liberado, update/delete não
-- (é feedback, não deveria ser editável depois de enviado).
create policy "own feedback select" on public.feedback
  for select using (user_id = auth.uid());

create policy "own feedback insert" on public.feedback
  for insert with check (user_id = auth.uid());
