/* O que as duas rotas de checkout do Asaas (/api/checkout e
   /api/checkout/pix-automatico) fazem igual. SERVER-ONLY. */

import { ambiente } from './asaas';

// Base pública da app (callbacks do checkout). Nunca hardcoded: vem de env
// (funciona em prod, preview e local); fallback pra origin da própria request.
export function baseUrl(request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/+$/, '');
  return request.nextUrl.origin;
}

/* CHAVE DE SANDBOX NO SITE DE VERDADE.

   Com a chave de testes, o Asaas aceita cartão de teste e Pix de mentira — e o
   webhook do sandbox, se apontado pra cá, liberaria acesso por eles. Em
   produção isso é vender de graça. A trava pode ser desligada de propósito
   (ASAAS_PERMITIR_SANDBOX=1) pra um teste controlado, e só assim. */
export function sandboxEmProducao() {
  const prod = process.env.VERCEL_ENV === 'production';
  return prod && ambiente() === 'sandbox' && process.env.ASAAS_PERMITIR_SANDBOX !== '1';
}

/* Grava a intenção de pagamento em `orders` e devolve o id (ou null).

   Degrada em dois passos: com as colunas da migration 0042 (`metodo`,
   `provider_customer_id`) e, se elas não existirem ainda, sem. */
export async function gravarPedido(admin, { user, planId, plan, metodo = null, customerId = null }) {
  const base = {
    user_id: user.id,
    email: String(user.email || '').trim().toLowerCase(),
    plan: planId,
    amount: plan.price / 100,
    currency: plan.currency,
    provider: 'asaas',
    status: 'pending',
  };
  const extra = {};
  if (metodo) extra.metodo = metodo;
  if (customerId) extra.provider_customer_id = customerId;

  for (const linha of [{ ...base, ...extra }, base]) {
    try {
      const { data, error } = await admin.from('orders').insert(linha).select('id').single();
      if (!error && data?.id) return data.id;
      if (error) console.error('[checkout] falha ao gravar pedido:', error.message);
    } catch (e) {
      console.error('[checkout] falha ao gravar pedido:', e?.message);
    }
  }
  return null;
}
