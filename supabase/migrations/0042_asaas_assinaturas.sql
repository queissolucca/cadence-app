-- Pagamentos pelo Asaas: assinatura mensal (cartão e Pix Automático) +
-- trimestral avulso. Aditiva e idempotente: pode rodar antes ou depois do
-- deploy. O código funciona SEM ela (degrada pelos caminhos via API do
-- Asaas), mas com ela fica mais rápido e ganha a trava de verdade contra
-- liberar duas vezes a mesma cobrança.

-- 1) orders: os ids do Asaas que amarram as cobranças de cada mês ao pedido.
--    `bill_id` (já existe) guarda o id do CHECKOUT, ou o da AUTORIZAÇÃO no
--    caso do Pix Automático.
alter table public.orders
  add column if not exists provider_customer_id     text,  -- cus_...
  add column if not exists provider_subscription_id text,  -- sub_...
  add column if not exists metodo                   text;  -- 'cartao' | 'pix_automatico' | null (avulso)

create index if not exists orders_provider_customer_idx     on public.orders (provider_customer_id);
create index if not exists orders_provider_subscription_idx on public.orders (provider_subscription_id);

-- 2) paid_emails: qual cobrança gerou cada linha de acesso.
--    O cartão manda DOIS eventos pela mesma cobrança (PAYMENT_CONFIRMED na
--    aprovação e PAYMENT_RECEIVED ~32 dias depois). Sem esta trava, cada
--    mensalidade no cartão valeria dois meses.
alter table public.paid_emails
  add column if not exists payment_ref text;               -- pay_...

create unique index if not exists paid_emails_provider_payment_ref_uidx
  on public.paid_emails (provider, payment_ref)
  where payment_ref is not null;
