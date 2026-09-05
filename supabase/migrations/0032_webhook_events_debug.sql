-- Observabilidade do webhook do AbacatePay: guarda o payload cru, o desfecho
-- (granted | no_email_found | dev_ignored_in_prod | save_failed: … | …) e o
-- email resolvido de CADA evento recebido. É o que permite diagnosticar
-- "paguei e não gravou" — o GET do webhook lê estas linhas.
--
-- Self-contained: cria webhook_events se ela não existir (caso a 0031 não tenha
-- sido rodada) e adiciona as colunas de debug se já existir.

create table if not exists public.webhook_events (
  id          text primary key,        -- id do evento (log_...) ou evt_uuid gerado
  event       text,
  provider    text default 'abacatepay',
  received_at timestamptz not null default now()
);

alter table public.webhook_events
  add column if not exists raw     jsonb,   -- payload cru recebido
  add column if not exists outcome text,    -- desfecho do processamento
  add column if not exists email   text;    -- email resolvido do payload

-- RLS ligado e SEM policies: ninguém acessa via anon/auth; só o service_role
-- (webhook / diagnóstico) escreve e lê.
alter table public.webhook_events enable row level security;
