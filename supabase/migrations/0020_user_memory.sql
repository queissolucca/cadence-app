-- Memória por usuário — fatos pessoais e duráveis (onde mora, trabalho, hobbies,
-- relacionamentos, finanças, saúde, objetivos, gostos, família) que os agentes
-- (Cady) usam pra personalizar a conversa. Organizada por categoria, igual à
-- memória do Claude. Extraída ao fim de cada conversa (1 chamada Haiku) e
-- limitada a 40 fatos por usuário (cap aplicado no backend) pra não pesar tokens.

create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'other',
  fact text not null,
  importance int not null default 3, -- 1..5 (5 = mais definidor)
  created_at timestamptz not null default now()
);

create index if not exists user_memory_user_idx
  on public.user_memory (user_id, importance desc, created_at desc);

alter table public.user_memory enable row level security;

create policy "own user_memory select" on public.user_memory
  for select using (user_id = auth.uid());
create policy "own user_memory insert" on public.user_memory
  for insert with check (user_id = auth.uid());
create policy "own user_memory delete" on public.user_memory
  for delete using (user_id = auth.uid());
