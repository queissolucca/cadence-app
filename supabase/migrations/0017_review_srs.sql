-- Repetição espaçada (Leitner) na aba Revisão.
-- box: caixa 1–5 (1 = novo/revisa hoje; 5 = graduado). due_at: quando volta a
-- aparecer em "Revisar hoje". Itens antigos entram na caixa 1, vencidos agora.

alter table public.review_saved
  add column if not exists box int not null default 1,
  add column if not exists due_at timestamptz not null default now();

-- Índice pra buscar rápido o que está vencido por usuário.
create index if not exists review_saved_due_idx
  on public.review_saved (user_id, status, due_at);
