-- Fixar conversas (até 5 por usuário — o limite é aplicado na API). Aparecem
-- num grupo "Fixadas" no topo da barra lateral da aba Conversar.
alter table public.conversations add column if not exists pinned boolean not null default false;

create index if not exists conversations_user_pinned_idx
  on public.conversations (user_id, pinned);
