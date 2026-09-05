-- Acesso por 3 meses: cada pagamento vale até `expires_at`. O middleware libera
-- o app só enquanto expires_at estiver no futuro (ou null = grandfathered, pra
-- não bloquear quem já pagou antes desta mudança). Um novo pagamento (renovação)
-- reescreve expires_at = agora + 3 meses via webhook.
alter table public.paid_emails add column if not exists expires_at timestamptz;
