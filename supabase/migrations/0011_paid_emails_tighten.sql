-- 0010 tinha uma policy de insert liberada pra qualquer um (mock temporário,
-- usado por app/api/payment/mock-confirm — removida). Agora que o webhook do
-- Kiwify (app/api/webhooks/kiwify) escreve com a service_role key, que
-- ignora RLS por padrão, essa policy virou só um buraco de segurança aberto
-- (qualquer request anônimo podia marcar qualquer email como pago). Remove.
drop policy if exists "mock payment can mark any email paid" on public.paid_emails;
