-- Recorde de streak (maior sequência já atingida) por usuário — pra mostrar no
-- pop-up de perfil. lib/sessionComplete.js atualiza esse valor (best-effort) a
-- cada sessão; enquanto esta coluna não existe, o app cai pro streak atual.
alter table public.profiles add column if not exists streak_max int not null default 0;

-- Backfill: quem já tem sequência começa com o recorde = streak atual.
update public.profiles set streak_max = streak_count where streak_count > streak_max;
