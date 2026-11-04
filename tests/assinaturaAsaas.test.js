import { describe, it, expect } from 'vitest';
import { soAsDoCadence } from '../lib/assinaturaAsaas.js';
import { EVENTOS_ASSINADOS } from '../lib/webhookAsaas.js';
import { lerFonte as ler } from './fonte.js';

/* CANCELAR SÓ O QUE É NOSSO.

   A conta do Asaas pode cobrar outros negócios do dono — inclusive de alguém
   com o mesmo e-mail. O botão "cancelar assinatura" do Cadence não pode
   derrubar uma cobrança que não é do Cadence. */

describe('o que entra na lista de assinaturas da pessoa', () => {
  const pedidos = [{ bill_id: 'chk_nosso', provider_subscription_id: null }];

  it('assinatura nascida de checkout nosso entra; a de outro negócio, não', () => {
    const itens = soAsDoCadence({
      pedidos,
      autorizacoes: [],
      assinaturas: [
        { id: 'sub_nossa', checkoutSession: 'chk_nosso', billingType: 'CREDIT_CARD', value: 39.9, nextDueDate: '2026-12-04' },
        { id: 'sub_alheia', checkoutSession: null, billingType: 'BOLETO', value: 150, nextDueDate: '2026-12-10' },
      ],
    });
    expect(itens.map((i) => i.assinaturaId)).toEqual(['sub_nossa']);
    expect(itens[0].tipo).toBe('cartao');
  });

  it('o Pix Automático e a assinatura que ele usa por baixo viram UM item só', () => {
    const itens = soAsDoCadence({
      pedidos: [],
      autorizacoes: [{ id: 'aut_1', subscriptionId: 'sub_pix', value: 39.9 }],
      assinaturas: [{ id: 'sub_pix', billingType: 'PIX', value: 39.9, nextDueDate: '2026-12-04' }],
    });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ tipo: 'pix_automatico', autorizacaoId: 'aut_1', assinaturaId: 'sub_pix', proximaCobranca: '2026-12-04' });
  });

  it('assinatura já vinculada a um pedido entra mesmo sem checkoutSession', () => {
    const itens = soAsDoCadence({
      pedidos: [{ bill_id: null, provider_subscription_id: 'sub_v' }],
      autorizacoes: [],
      assinaturas: [{ id: 'sub_v', billingType: 'CREDIT_CARD', value: 39.9 }],
    });
    expect(itens).toHaveLength(1);
  });
});

describe('o script de setup assina exatamente o que o webhook trata', () => {
  const script = ler('scripts/asaas-setup.mjs');
  const lista = [...script.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).filter((e) => EVENTOS_ASSINADOS.includes(e) || /^(PAYMENT|SUBSCRIPTION|CHECKOUT|PIX_AUTOMATIC)_/.test(e));

  it('mesma lista, nem um a mais nem um a menos', () => {
    expect([...new Set(lista)].sort()).toEqual([...EVENTOS_ASSINADOS].sort());
  });

  it('todos os nomes existem na lista oficial do Asaas (schema de POST /v3/webhooks, 2026-11)', () => {
    const OFICIAIS = [
      'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_PARTIALLY_REFUNDED', 'PAYMENT_OVERDUE', 'PAYMENT_CREATED',
      'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED',
      'CHECKOUT_CREATED', 'CHECKOUT_CANCELED', 'CHECKOUT_EXPIRED', 'CHECKOUT_PAID',
      'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
      'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED',
      'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED', 'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED',
    ];
    for (const e of EVENTOS_ASSINADOS) expect(OFICIAIS, e).toContain(e);
  });

  it('entrega em ordem, pro vínculo chegar antes da renovação', () => {
    expect(script).toContain("sendType: 'SEQUENTIALLY'");
  });
});
