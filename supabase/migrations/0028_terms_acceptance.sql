-- Registro de aceite dos Termos e Condições de Uso.
-- Uma linha por (usuário, versão dos Termos): re-aceitar a mesma versão é
-- idempotente (upsert por chave composta); uma nova versão (bump em
-- lib/terms.js -> TERMS_VERSION) gera uma nova linha, preservando o histórico
-- de qual versão o usuário aceitou e quando.
create table if not exists public.terms_acceptance (
  user_id     uuid not null references auth.users (id) on delete cascade,
  version     text not null,
  email       text,
  accepted_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (user_id, version)
);

alter table public.terms_acceptance enable row level security;

-- O usuário só enxerga e grava o próprio aceite. Sem UPDATE/DELETE: aceite é
-- append-only (o upsert usa ON CONFLICT DO NOTHING no servidor).
drop policy if exists "own terms select" on public.terms_acceptance;
create policy "own terms select" on public.terms_acceptance
  for select using (user_id = auth.uid());

drop policy if exists "own terms insert" on public.terms_acceptance;
create policy "own terms insert" on public.terms_acceptance
  for insert with check (user_id = auth.uid());

create index if not exists terms_acceptance_email_idx on public.terms_acceptance (email);
