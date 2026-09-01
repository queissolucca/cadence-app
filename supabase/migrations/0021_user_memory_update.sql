-- Permite EDITAR memórias (a 0020 só tinha select/insert/delete). Sem esta
-- policy, o update é bloqueado silenciosamente pelo RLS.

drop policy if exists "own user_memory update" on public.user_memory;
create policy "own user_memory update" on public.user_memory
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
