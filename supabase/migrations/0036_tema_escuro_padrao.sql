-- Conta nova nasce no tema ESCURO.
--
-- O app já se dizia escuro por padrão em dois lugares — ThemeProviderV2 usa
-- defaultTheme="dark", e o ThemeSync comenta "default é escuro; null/auto caem
-- pro escuro". Mas nenhum dos dois chegava a decidir nada: a coluna foi criada
-- na 0005 como `not null default 'light'`, e o trigger handle_new_user() insere
-- em profiles SEM passar theme. Ou seja, todo perfil novo já nascia com 'light'
-- gravado — um valor explícito, indistinguível de uma escolha da pessoa. O
-- ThemeSync via 'light' e obedecia, corretamente.
--
-- Por isso a correção é aqui, e não no código: não havia caminho em JS que
-- criasse esse registro.

alter table public.profiles
  alter column theme set default 'dark';

-- O trigger passa a ser explícito também. Só o default da coluna já bastaria
-- para o caminho de hoje, mas deixar o trigger mudo fazia o comportamento
-- depender de um default invisível a quem lê a função — que foi exatamente o
-- que escondeu este bug.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, theme)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'dark'
  );
  return new;
end;
$$;

-- NÃO mexemos em quem já existe. Uma linha 'light' antiga pode ser tanto o
-- default velho quanto uma escolha real em Ajustes, e as duas são idênticas no
-- banco — sobrescrever tiraria de alguém uma preferência que a pessoa marcou.
-- Para virar contas antigas que comprovadamente nunca abriram os Ajustes,
-- rode à mão, com o olho no que vai mudar:
--
--   update public.profiles set theme = 'dark'
--    where theme = 'light' and onboarded_at is null;
