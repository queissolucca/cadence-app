-- FIX: a tabela conversations (0012) tinha RLS com select/insert/delete mas
-- NENHUMA policy de UPDATE. Sem ela, todo update é bloqueado silenciosamente
-- (0 linhas): fixar conversa, "continuar" (anexar falas) e o chat de texto
-- (que salva o 1º turno por insert e o resto por update) não persistiam.
-- Também garante a coluna `pinned` (0014) caso não tenha sido aplicada.

alter table public.conversations add column if not exists pinned boolean not null default false;

create index if not exists conversations_user_pinned_idx
  on public.conversations (user_id, pinned);

drop policy if exists "own conversations update" on public.conversations;
create policy "own conversations update" on public.conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
