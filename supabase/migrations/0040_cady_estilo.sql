-- O estilo da Cady que a pessoa escolhe no Perfil: 'iniciante', 'equilibrada'
-- (o padrão) ou 'acida'. Hoje só o Escrever lê isto (/api/chat, via
-- lib/cady/tomServidor.js); o prompt da voz vive no painel do ElevenLabs.
--
-- Por que 0040 e não 0039: a branch ajuste/para-creators já tem uma
-- 0039_creators.sql. Duas migrations com o mesmo número rodadas à mão são a
-- receita pra alguém achar que já rodou a outra.
--
-- PODE RODAR A QUALQUER MOMENTO, antes ou depois do deploy. O código foi
-- escrito pra funcionar sem esta coluna:
--   - /api/chat lê o estilo numa consulta só dele e, se ela falhar, trata
--     como 'equilibrada' (o nome da pessoa continua vindo do select antigo);
--   - a aba Perfil esconde a linha "Estilo da Cady" enquanto a coluna não
--     existe;
--   - /api/profile/preferences grava o estilo num update separado, então
--     trocar tema ou meta semanal nunca depende desta coluna.
--
-- Todo mundo que já existe nasce 'equilibrada' pelo default, que é a mudança
-- pedida: gentil nas 3 primeiras conversas e com quem trava, ácida só depois
-- de acertar algumas frases. Quem quiser a Cady ácida de antes escolhe 'acida'.
--
-- Coluna NOT NULL com default constante não reescreve a tabela (Postgres 11+),
-- então é instantânea mesmo com muitas linhas. O trigger handle_new_user() não
-- precisa mudar: ele não lista esta coluna e o default preenche.

alter table public.profiles
  add column if not exists cady_estilo text not null default 'equilibrada';

alter table public.profiles
  drop constraint if exists profiles_cady_estilo_check;

alter table public.profiles
  add constraint profiles_cady_estilo_check
  check (cady_estilo in ('iniciante', 'equilibrada', 'acida'));
