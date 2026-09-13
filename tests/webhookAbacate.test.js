import { describe, it, expect } from 'vitest';
import {
  ehSaidaDeDinheiro, ehCompraPaga, looksPaid, deepFindEmail, emailDoCliente,
  idsDaCobranca, externalIdsDoPayload, externalIdsConsultaveis, deepFindAmount,
  normalizarEmail,
} from '../lib/webhookAbacate';
import { classifyEvent } from '../lib/payments';

/* O pagamento do Erik (12/set) não virou linha em paid_emails. Estes testes
   fixam as duas causas que a investigação encontrou: um evento de COMPRA cujo
   payload não traz email (data.customer vem null na v2), e um evento de SAQUE
   que o teste textual de "parece pago" aprovava como se fosse compra. */

// Formato v2 do checkout.completed, como o painel manda.
const compra = (extra = {}) => ({
  event: 'checkout.completed',
  data: {
    checkout: { id: 'bill_yCmF2ueKLk2UCX1nRC4NCeEY', externalId: '9f6d2c1e-4a2b-4c8d-9e1f-0a1b2c3d4e5f', status: 'PAID', amount: 9700 },
    customer: null,
    ...extra,
  },
});

describe('quem NÃO pode liberar acesso', () => {
  // withdraw/payout/transfer é dinheiro saindo pro dono da loja. O nome termina
  // em ".completed", então o teste textual dizia "pago" — e o email que
  // estivesse no payload (o da própria loja) ganhava 3 meses de graça.
  const saques = ['withdraw.completed', 'payout.completed', 'transfer.completed', 'balance.updated', 'cashout.completed'];

  it.each(saques)('%s é saída de dinheiro, não compra', (ev) => {
    expect(ehSaidaDeDinheiro(ev)).toBe(true);
    expect(ehCompraPaga(ev, { event: ev, data: { status: 'COMPLETED' } })).toBe(false);
  });

  it('um saque com o email da loja no payload não libera acesso', () => {
    const saque = { event: 'withdraw.completed', data: { status: 'COMPLETED', account: { email: 'dono@onigirun.com' } } };
    // O email ESTÁ lá e o payload PARECE pago — e ainda assim não é compra.
    expect(deepFindEmail(saque)).toBe('dono@onigirun.com');
    expect(looksPaid(saque)).toBe(true);
    expect(ehCompraPaga(saque.event, saque)).toBe(false);
  });
});

describe('quem PODE liberar acesso', () => {
  const compras = ['checkout.completed', 'billing.paid', 'pix.paid', 'payment.approved', 'subscription.renewed'];

  it.each(compras)('%s é compra', (ev) => {
    expect(ehSaidaDeDinheiro(ev)).toBe(false);
    expect(ehCompraPaga(ev, { event: ev, data: {} })).toBe(true);
  });

  it('um nome de evento desconhecido com status PAID ainda passa', () => {
    const novo = { event: 'order.settled.v3', data: { status: 'PAID' } };
    expect(ehCompraPaga(novo.event, novo)).toBe(true);
  });
});

describe('de quem é o pagamento', () => {
  it('data.customer null deixa o payload sem email — a causa do caso do Erik', () => {
    const b = compra();
    expect(emailDoCliente(b)).toBe(null);
    expect(deepFindEmail(b)).toBe(null);
  });

  it('o bill_id do payload é o que liga o evento ao pedido em orders', () => {
    expect(idsDaCobranca(compra())).toContain('bill_yCmF2ueKLk2UCX1nRC4NCeEY');
  });

  it('o externalId uuid é consultável em orders.id', () => {
    expect(externalIdsConsultaveis(compra())).toEqual(['9f6d2c1e-4a2b-4c8d-9e1f-0a1b2c3d4e5f']);
  });

  it('o externalId de fallback do checkout NÃO vai pro banco', () => {
    // orders.id é coluna uuid: consultar "cad_<user>_<ts>" estoura 22P02 no
    // Postgres em vez de simplesmente não achar nada.
    const b = { event: 'checkout.completed', data: { checkout: { externalId: 'cad_2b7f_1757600000000' } } };
    expect(externalIdsDoPayload(b)).toEqual(['cad_2b7f_1757600000000']);
    expect(externalIdsConsultaveis(b)).toEqual([]);
  });

  it('quando o AbacatePay manda o cliente, o email dele vem antes da busca solta', () => {
    const b = compra({ customer: { metadata: { email: 'erik.yamanaka@gmail.com' } } });
    expect(emailDoCliente(b)).toBe('erik.yamanaka@gmail.com');
  });
});

describe('valor', () => {
  it('centavos viram reais', () => {
    expect(deepFindAmount(compra())).toBe(9700);
    expect(Math.round(deepFindAmount(compra())) / 100).toBe(97);
  });
});


/* Os 16 eventos que a doc do AbacatePay lista como assinaveis. Eram conhecidos
   por chute antes — 'billing.paid', 'pix.paid' e 'payment.*' nem existem. */
const OFICIAIS = [
  'checkout.completed', 'checkout.refunded', 'checkout.disputed', 'checkout.lost',
  'transparent.completed', 'transparent.refunded', 'transparent.disputed', 'transparent.lost',
  'subscription.completed', 'subscription.cancelled', 'subscription.renewed', 'subscription.trial_started',
  'payout.completed', 'payout.failed', 'transfer.completed', 'transfer.failed',
];

// Reembolso/disputa chega com o payload do pagamento ORIGINAL, que ainda diz PAID.
const comStatusPago = (ev) => ({ event: ev, data: { checkout: { id: 'bill_x', status: 'PAID' } } });

describe('os 16 eventos oficiais', () => {
  const LIBERAM = ['checkout.completed', 'transparent.completed', 'subscription.completed', 'subscription.renewed'];

  it.each(OFICIAIS)('%s decide certo, mesmo com PAID no payload', (ev) => {
    expect(ehCompraPaga(ev, comStatusPago(ev))).toBe(LIBERAM.includes(ev));
  });

  // O furo: so checkout.refunded/disputed eram revogacao. Os outros quatro
  // caiam no grant por causa do PAID que vem no corpo do proprio reembolso.
  it.each(['checkout.refunded', 'checkout.disputed', 'checkout.lost',
    'transparent.refunded', 'transparent.disputed', 'transparent.lost'])(
    '%s revoga acesso, nunca libera', (ev) => {
      expect(classifyEvent(ev)).toBe('revoke');
      expect(ehCompraPaga(ev, comStatusPago(ev))).toBe(false);
    });

  it('transparent.completed e pagamento de verdade e libera', () => {
    expect(classifyEvent('transparent.completed')).toBe('grant');
  });
});

describe('caixa do e-mail', () => {
  // paid_emails.email e chave primaria TEXT e o middleware compara com
  // .eq('email', user.email): "Erik@Gmail.com" nunca casaria com o login.
  it('normaliza para minusculo e sem espaco', () => {
    expect(normalizarEmail('  Erik.Yamanaka@Gmail.COM ')).toBe('erik.yamanaka@gmail.com');
  });

  it('o email do cliente no payload vem minusculo', () => {
    const b = { event: 'checkout.completed', data: { customer: { metadata: { email: 'Erik.Yamanaka@Gmail.com' } } } };
    expect(emailDoCliente(b)).toBe('erik.yamanaka@gmail.com');
  });

  it('a busca solta tambem vem minuscula', () => {
    expect(deepFindEmail({ a: { email: 'ALGUEM@Exemplo.com' } })).toBe('alguem@exemplo.com');
  });
});
