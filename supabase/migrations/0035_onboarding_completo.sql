-- Tudo o que as 33 telas perguntam passa a caber na tabela.
--
-- A 0034 trouxe áudio, voz alta, prazo, horário, temas e tom. Sobraram três
-- respostas que a pessoa dá e que não tinham onde cair — a tela pergunta, ela
-- responde, e o dado morria no localStorage quando a conta nascia:
--
--   language      — o idioma escolhido na 2ª tela (a vitrine de bandeiras).
--                   Hoje só existe inglês, mas a tela pergunta, e a resposta é
--                   o sinal mais direto de demanda por outro idioma que este
--                   funil produz. Sem a coluna, ninguém consegue responder
--                   "quantas pessoas pediram espanhol?".
--   speech_sample — o que a pessoa FALOU no teste de fala ("I'd like a table
--                   for two, please"). É a única amostra de produção real antes
--                   da primeira aula, e é com o que qualquer medida de progresso
--                   vai ter que comparar depois.
--   invite_code   — o código de convite do cadastro. Já ia pro
--                   auth.users.raw_user_meta_data, que serve pra consultar uma
--                   conta, mas não pra cruzar convite com o resto do funil.
--
-- E `answers`, que é de outra natureza: o estado bruto das telas, como jsonb.
--
-- Por que guardar o bruto além das colunas tipadas: coluna é contrato, e todo
-- contrato fica pra trás. Este funil já mudou de forma três vezes em duas
-- semanas — quem adicionar uma tela nova amanhã vai lembrar de pôr o campo na
-- tela, e pode não lembrar de criar a coluna, e aí o dado some sem ninguém
-- notar (a gravação é best-effort; ninguém vê erro). Com o bruto, a resposta
-- fica guardada desde o primeiro dia, e a coluna tipada pode ser criada depois,
-- preenchida a partir dele. As colunas continuam existindo porque é nelas que
-- se consulta; o jsonb é a rede embaixo.
--
-- Puramente aditiva: só `add column if not exists`. Nenhum drop, nenhum rename,
-- nenhuma policy tocada. Rodar isto não pode quebrar quem já está usando o app,
-- e não rodar também não: o POST /api/onboarding cai em degraus e grava o que
-- couber (ver app/api/onboarding/route.js).

alter table public.onboarding
  add column if not exists language      text,   -- "Inglês" | "Espanhol" | ...
  add column if not exists speech_sample text,   -- transcrição do teste de fala
  add column if not exists invite_code   text,   -- código de convite do cadastro
  add column if not exists answers       jsonb;  -- estado bruto das 33 telas

comment on column public.onboarding.language is
  'Idioma escolhido na vitrine (2ª tela). Hoje o produto só entrega inglês; esta coluna é o sinal de demanda pelos outros.';
comment on column public.onboarding.speech_sample is
  'O que a pessoa falou no teste de fala, antes de qualquer aula. Linha de base pra comparar progresso depois.';
comment on column public.onboarding.answers is
  'Estado bruto das telas, como a pessoa respondeu. Rede de segurança: pergunta nova entra aqui mesmo antes de existir coluna própria.';
