import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Só usado pelo webhook do Kiwify (app/api/webhooks/kiwify) — a service_role
// key ignora RLS de propósito, porque quem chama é o Kiwify servidor a
// servidor, sem sessão de usuário nenhuma pra casar com as policies normais.
// NUNCA importar isso em código que roda no browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
