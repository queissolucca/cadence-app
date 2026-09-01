-- paid_emails passa a guardar o valor pago e o método (PIX, cartão, etc.) +
-- o provedor. Preenchido pelo webhook do AbacatePay.

alter table public.paid_emails
  add column if not exists amount numeric,     -- valor pago em reais (ex: 89.00)
  add column if not exists method text,        -- 'PIX' | 'credit_card' | 'boleto' | ...
  add column if not exists provider text;      -- 'abacatepay' | 'kiwify'
