-- Conta nova volta a nascer no tema CLARO.
--
-- A 0036 tinha acabado de virar isto pro escuro, três dias atrás. O motivo de
-- desfazer não é arrependimento de gosto: o onboarding inteiro (as 32 telas do
-- /comecar) passou a ser claro com vidro fosco no mesmo deploy, e entrar no app
-- era cair num buraco preto logo depois de 32 telas de papel.
--
-- Vale registrar o que a 0036 consertou, porque ISSO continua valendo: antes
-- dela o trigger handle_new_user() não passava `theme` e o comportamento
-- dependia de um default invisível a quem lia a função. Aqui o trigger segue
-- explícito — só mudou o valor.

alter table public.profiles
  alter column theme set default 'light';

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
    'light'
  );
  return new;
end;
$$;

-- Continua sem tocar em quem já existe, pela mesma razão da 0036: 'dark'
-- gravado pode ser o default dos últimos três dias OU alguém que escolheu
-- escuro em Ajustes, e as duas coisas são idênticas no banco.
--
-- Mas aqui há uma janela conhecida e pequena: quem criou conta ENTRE a 0036 e
-- esta migration recebeu 'dark' sem ter escolhido. Se quiser devolver essas —
-- e só essas — ao padrão, rode olhando o que vai mudar:
--
--   select id, created_at from public.profiles
--    where theme = 'dark' and created_at >= '2026-09-14';
--
--   update public.profiles set theme = 'light'
--    where theme = 'dark' and created_at >= '2026-09-14';
