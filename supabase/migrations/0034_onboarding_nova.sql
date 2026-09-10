-- Campos que a nova interface (/comecar) pergunta e o onboarding antigo não
-- tinha. Puramente aditiva: só `add column if not exists` numa tabela que já
-- existe. Nenhum drop, nenhum rename, nenhuma policy tocada — rodar isto não
-- pode quebrar quem já está usando o app.
--
-- O que reaproveita as colunas que já existem:
--   nivel    -> level          (autoavaliação, mesma pergunta)
--   objetivo -> reasons        (jsonb, array de 1 no fluxo novo)
--   bloqueio -> challenges     (jsonb, array de 1)
--   minutos  -> daily_goal     ("10 minutos / dia")
--
-- O que é novo:

alter table public.onboarding
  add column if not exists audio_pref   text,   -- "Pode falar sempre" | "Só nos exercícios" | ...
  add column if not exists speaks_today text,   -- "Zero — faz tempo..." | "Menos de 10 minutos por dia" | ...
  add column if not exists deadline     text,   -- "1 mês" | "3 meses" | "6 meses"
  add column if not exists best_time    text,   -- "De manhã" | "No almoço" | "À noite" | "Sem hora fixa"
  add column if not exists topics       jsonb,  -- ["Viagem","Trabalho",...]
  add column if not exists tone         text,   -- agressivo | normal
  add column if not exists source       text;   -- 'v1' (funil antigo) | 'comecar'

-- O texto guardado é o rótulo legível, não o código da tela: ele vai direto pra
-- memória da Cady e precisa ler como frase (ver lib/comecar/paraApi.js).

-- Marca as linhas que já existem como vindas do funil antigo, pra a coluna
-- `source` conseguir separar as duas coortes daqui pra frente (comparar
-- conversão de um funil contra o outro depende disso).
update public.onboarding set source = 'v1' where source is null;

comment on column public.onboarding.source is
  'De qual funil veio: v1 = /login -> /onboarding -> /pagamento; comecar = nova interface de 33 telas.';
