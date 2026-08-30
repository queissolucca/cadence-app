-- Aba Revisão: itens que o usuário guarda pra revisar depois — um erro que
-- cometeu, uma frase/expressão pra soar natural, ou uma palavra nova. Salvos
-- por comando de voz na conversa ("save this", "memorize X") ou manualmente.
--
-- Organização: `category` agrupa (correção/frase/palavra) e `status` deixa
-- "matar" o que já dominou (active -> learned), pra não acumular infinito.
create table public.review_saved (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  example text,
  note text,
  category text not null default 'phrase', -- 'correction' | 'phrase' | 'word'
  status text not null default 'active',   -- 'active' | 'learned'
  created_at timestamptz not null default now()
);

create index review_saved_user_status_idx
  on public.review_saved (user_id, status, created_at desc);

alter table public.review_saved enable row level security;

create policy "own review_saved select" on public.review_saved
  for select using (user_id = auth.uid());
create policy "own review_saved insert" on public.review_saved
  for insert with check (user_id = auth.uid());
create policy "own review_saved update" on public.review_saved
  for update using (user_id = auth.uid());
create policy "own review_saved delete" on public.review_saved
  for delete using (user_id = auth.uid());
