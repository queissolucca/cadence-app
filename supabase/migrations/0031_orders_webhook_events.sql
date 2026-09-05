-- Pagamento por cartão/PIX (AbacatePay, checkout hospedado).
-- 1) orders: uma intenção de pagamento por checkout criado (status + bill_...).
-- 2) webhook_events: idempotência — cada evento (log_...) processado uma vez só.
-- O ACESSO em si continua em paid_emails (com expires_at); estas tabelas são
-- rastreio + idempotência. Escrita é feita pelo service_role (rota/webhook).

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  email       text,
  plan        text not null,
  amount      numeric,                 -- reais
  currency    text default 'BRL',
  provider    text default 'abacatepay',
  bill_id     text,                    -- bill_... retornado pelo checkout
  checkout_url text,
  status      text not null default 'pending', -- pending|paid|refunded|disputed|canceled
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_bill_idx on public.orders (bill_id);

alter table public.orders enable row level security;
-- Só o dono lê os próprios pedidos. Escrita é via service_role (bypassa RLS).
drop policy if exists "own orders select" on public.orders;
create policy "own orders select" on public.orders
  for select using (user_id = auth.uid());

create table if not exists public.webhook_events (
  id          text primary key,        -- id do evento (log_...) — idempotência
  event       text,
  provider    text default 'abacatepay',
  received_at timestamptz not null default now()
);
-- RLS ligado e SEM policies: ninguém acessa via anon/auth; só o service_role
-- (webhook) escreve/lê.
alter table public.webhook_events enable row level security;
