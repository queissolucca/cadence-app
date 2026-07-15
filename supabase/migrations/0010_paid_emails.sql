-- Cadence — funil onboarding -> pagamento -> app: só libera /v2 pra quem
-- pagou. Tabela por email (não por user_id) de propósito: o pagamento
-- (mockado por ora, ver app/api/payment/mock-confirm) pode acontecer antes
-- de existir conta — o middleware casa pelo email assim que o usuário loga.
create table public.paid_emails (
  email text primary key,
  paid_at timestamptz not null default now()
);

alter table public.paid_emails enable row level security;

-- Mock temporário: qualquer um pode marcar um email como pago. Troca pra uma
-- policy restrita ao service role assim que o webhook do provedor de
-- pagamento de verdade existir.
create policy "mock payment can mark any email paid" on public.paid_emails
  for insert with check (true);

-- Usuário logado só enxerga o próprio status de pagamento.
create policy "user can check own paid status" on public.paid_emails
  for select using (email = (auth.jwt() ->> 'email'));
