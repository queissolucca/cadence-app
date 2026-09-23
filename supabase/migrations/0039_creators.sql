-- Cadence — "Para Creators" (aba Perfil). Mesmo desenho da tabela feedback:
-- quem está logado manda os dados, só lê o que ele mesmo enviou, e não edita
-- depois de enviado. Organizado por created_at.
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  ddd text not null,
  telefone text not null,
  instagram text not null,
  nichos text[] not null default '{}',
  nicho_outro text,
  created_at timestamptz not null default now()
);

alter table public.creators enable row level security;

create policy "own creators select" on public.creators
  for select using (user_id = auth.uid());

create policy "own creators insert" on public.creators
  for insert with check (user_id = auth.uid());

create index if not exists creators_created_idx on public.creators (created_at desc);
