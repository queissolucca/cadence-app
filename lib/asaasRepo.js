/* O banco do webhook do Asaas — a metade de `processarEvento` que toca o
   Supabase (service_role). SERVER-ONLY.

   Cada método DEGRADA em vez de lançar: a migration 0042 (colunas novas em
   `orders` e `paid_emails.payment_ref`) pode não ter rodado ainda quando o
   código for publicado, e um webhook que estoura por coluna inexistente vira
   500 em loop — que no Asaas pausa a fila inteira. Sem a 0042 o fluxo perde o
   atalho dos vínculos e cai nos degraus via API, mas libera do mesmo jeito. */

import { validadeAtual as validadeAtualDe } from './acessoPago';

const agoraISO = () => new Date().toISOString();

// Colunas pelas quais um pedido pode ser procurado. Lista fechada: o nome da
// coluna vai direto pra consulta.
const COLUNAS = new Set(['id', 'bill_id', 'provider_subscription_id', 'provider_customer_id']);

export function repoSupabase(admin) {
  return {
    async pedidoPor(coluna, valor) {
      if (!COLUNAS.has(coluna) || !valor) return null;
      try {
        const r = await admin
          .from('orders')
          .select('id,email,plan,user_id,status')
          .eq(coluna, valor)
          .order('created_at', { ascending: false })
          .limit(1);
        return r.error ? null : r.data?.[0] || null;
      } catch {
        return null;
      }
    },

    async vincular(coluna, valor, campos) {
      if (!COLUNAS.has(coluna) || !valor) return;
      try {
        let r = await admin.from('orders').update({ ...campos, updated_at: agoraISO() }).eq(coluna, valor);
        // Sem a 0042, as colunas provider_* não existem: grava ao menos o status.
        if (r.error && campos.status) {
          r = await admin.from('orders').update({ status: campos.status, updated_at: agoraISO() }).eq(coluna, valor);
        }
      } catch { /* best-effort */ }
    },

    async emailDoUsuario(userId) {
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        return data?.user?.email || null;
      } catch {
        return null;
      }
    },

    /* Esta cobrança já deu acesso? Duas fontes, porque a primeira depende da
       migration: a coluna `payment_ref` (com índice único — a trava de
       verdade) e, sem ela, o próprio registro de eventos: um evento anterior
       desta mesma cobrança que terminou em "liberado".

       `%liberado%` e não `liberado%`: uma reentrega do MESMO evento sobrescreve
       a linha dele com "ja_liberado" (o id é o mesmo). Com o prefixo, a trava
       sumiria e o RECEIVED do cartão, 32 dias depois, liberaria outro mês. */
    async jaLiberou({ chave, campo, valor }) {
      try {
        const r = await admin.from('paid_emails').select('id').eq('payment_ref', chave).limit(1);
        if (!r.error && r.data?.length) return true;
      } catch { /* coluna pode não existir */ }
      // `campo` é 'id' (cobrança) ou 'installment' (parcelamento) — ver
      // refDaCompra em lib/webhookAsaas.js.
      if (campo !== 'id' && campo !== 'installment') return false;
      try {
        const r = await admin
          .from('webhook_events')
          .select('id')
          .eq('provider', 'asaas')
          .eq(`raw->payment->>${campo}`, valor)
          .like('outcome', '%liberado%')
          .limit(1);
        return !r.error && !!r.data?.length;
      } catch {
        return false;
      }
    },

    validadeAtual(email) {
      return validadeAtualDe(admin, email);
    },

    /* Grava UMA linha de acesso por cobrança. Degrada tirando colunas
       opcionais — NUNCA o `expires_at` (sem ele a linha vale pra sempre: ver o
       mesmo cuidado no webhook do AbacatePay). */
    async gravarAcesso(linha) {
      const { payment_ref, amount, method, provider, paid_at, ...base } = linha;
      const tentativas = [
        linha,
        { ...base, provider, paid_at, amount, method },        // sem a 0042
        { ...base, paid_at },                                    // sem a 0024
        { ...base },                                             // só email + expires_at
      ];
      let ultimo = null;
      for (const t of tentativas) {
        const limpa = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined));
        const r = await admin.from('paid_emails').insert(limpa);
        if (!r.error) return { error: null };
        // 23505 = esta cobrança já tem linha (índice único da 0042). Outra
        // entrega do mesmo evento chegou primeiro: não é erro, é idempotência.
        if (r.error.code === '23505') return { error: null };
        ultimo = r.error;
      }
      return { error: ultimo };
    },

    async revogar(email) {
      try { await admin.from('paid_emails').update({ expires_at: agoraISO() }).eq('email', email); } catch { /* best-effort */ }
    },
  };
}

/* Registra TODA chamada recebida (payload, desfecho, e-mail resolvido) em
   webhook_events — é o que o GET de diagnóstico mostra. O id é o do evento do
   Asaas, então uma reentrega sobrescreve a mesma linha em vez de duplicar. */
export async function registrarEvento(admin, { id, event, outcome, raw, email }) {
  try {
    const rich = { id, event: event || '', provider: 'asaas', outcome, email: email || null, raw, received_at: agoraISO() };
    const r = await admin.from('webhook_events').upsert(rich, { onConflict: 'id' });
    if (r.error) await admin.from('webhook_events').upsert({ id, event: event || '', provider: 'asaas' }, { onConflict: 'id' });
  } catch { /* registrar nunca pode derrubar a resposta */ }
}
