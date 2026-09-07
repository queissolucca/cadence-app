-- Gestão de senha (definir / redefinir) — o que precisa existir no banco:
--
--  1) profiles.password_set_at  → quando a senha atual foi definida. É o que a
--     aba Perfil mostra ("Senha definida em …") e o que diferencia "Definir
--     senha" de "Redefinir senha" na UI.
--  2) has_password()            → fonte da verdade de verdade: lê
--     auth.users.encrypted_password (vazio pra quem só usa Google/link mágico).
--     É por isso que a trava da senha antiga não pode ser burlada: quem tem
--     senha SEMPRE precisa digitar a atual pra trocar.
--  3) backfill                  → quem já tinha senha antes desta migration
--     ganha password_set_at (data de criação da conta), senão a UI ofereceria
--     "definir" (sem pedir a senha antiga) pra quem já tem senha.
--
-- O histórico de trocas fica em public.user_events (event 'password_set' /
-- 'password_changed'), gravado pela rota /api/account/password — sem tabela
-- nova, seguindo o que já existe pro resto do app.

alter table public.profiles add column if not exists password_set_at timestamptz;

-- security definer: usuário comum não pode ler auth.users, mas pode perguntar
-- "eu tenho senha?" sobre si mesmo. Devolve só um booleano da própria conta.
create or replace function public.has_password()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(nullif(u.encrypted_password, ''), null) is not null
    from auth.users u
   where u.id = auth.uid();
$$;

revoke all on function public.has_password() from public;
grant execute on function public.has_password() to authenticated;

-- Backfill: marca password_set_at pra quem já tem senha e ainda não tinha a
-- coluna preenchida.
update public.profiles p
   set password_set_at = u.created_at
  from auth.users u
 where u.id = p.id
   and p.password_set_at is null
   and coalesce(nullif(u.encrypted_password, ''), null) is not null;
