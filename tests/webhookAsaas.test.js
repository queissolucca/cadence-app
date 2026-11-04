import { describe, it, expect, beforeEach } from 'vitest';
import {
  classificar, processarEvento, validadeDaAssinatura, planoPeloValor,
  EVENTOS_ASSINADOS, FOLGA_DIAS,
} from '../lib/webhookAsaas.js';

/* O WEBHOOK INTEIRO, COM UM BANCO DE MENTIRA.

   `processarEvento` recebe o banco e a API do Asaas por parâmetro justamente
   pra isto: rodar a sequência real de eventos (checkout → cobrança →
   renovação → estorno) e olhar o que sobra em paid_emails, em vez de conferir
   o texto do arquivo. */

const USER = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const OUTRO_USER = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';

function bancoFalso({ comMigration = true } = {}) {
  const db = { orders: [], paid: [], liberados: new Set(), usuarios: { [USER]: 'ana@x.com', [OUTRO_USER]: 'bia@x.com' } };
  const repo = {
    async pedidoPor(coluna, valor) {
      if (!comMigration && (coluna === 'provider_subscription_id' || coluna === 'provider_customer_id')) return null;
      return [...db.orders].reverse().find((o) => o[coluna] === valor) || null;
    },
    async vincular(coluna, valor, campos) {
      for (const o of db.orders) {
        if (o[coluna] !== valor) continue;
        for (const [k, v] of Object.entries(campos)) {
          if (!comMigration && k.startsWith('provider_')) continue;
          o[k] = v;
        }
      }
    },
    async emailDoUsuario(id) { return db.usuarios[id] || null; },
    async jaLiberou(ref) { return db.liberados.has(ref.chave); },
    async validadeAtual(email) {
      const v = db.paid.filter((p) => p.email === email).map((p) => p.expires_at).sort().reverse();
      return v[0] || null;
    },
    async gravarAcesso(linha) {
      if (db.falharGravacao) return { error: { message: 'connection refused' } };
      db.paid.push(linha);
      db.liberados.add(linha.payment_ref);
      return { error: null };
    },
    async revogar(email) {
      for (const p of db.paid) if (p.email === email) p.expires_at = '1970-01-01T00:00:00.000Z';
    },
  };
  const asaas = {
    clientes: {},
    assinaturas: {},
    async buscarCliente(id) { if (!this.clientes[id]) throw new Error('404'); return this.clientes[id]; },
    async buscarAssinatura(id) { if (!this.assinaturas[id]) throw new Error('404'); return this.assinaturas[id]; },
  };
  return { db, repo, asaas };
}

const pagamento = (over = {}) => ({
  object: 'payment', id: 'pay_1', customer: 'cus_1', value: 39.9, billingType: 'CREDIT_CARD',
  dueDate: '2026-11-04', status: 'CONFIRMED', ...over,
});
const ev = (event, payment, extra = {}) => ({ id: `evt_${Math.random()}`, event, payment, ...extra });

describe('o nome do evento decide, e só o nome exato', () => {
  it('pago, estorno, fim, vínculo', () => {
    expect(classificar('PAYMENT_CONFIRMED')).toBe('liberar');
    expect(classificar('PAYMENT_RECEIVED')).toBe('liberar');
    expect(classificar('PAYMENT_REFUNDED')).toBe('revogar');
    expect(classificar('PAYMENT_CHARGEBACK_REQUESTED')).toBe('revogar');
    expect(classificar('SUBSCRIPTION_DELETED')).toBe('encerrar');
    expect(classificar('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED')).toBe('encerrar');
    expect(classificar('CHECKOUT_PAID')).toBe('vincular');
  });

  it('nada de "parece pago": nomes parecidos não liberam', () => {
    // O AbacatePay liberava acesso por regex — e um reembolso, um saque do
    // dono e um trial grátis passaram por ele.
    for (const e of ['PAYMENT_CREATED', 'PAYMENT_AUTHORIZED', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
      'TRANSFER_DONE', 'payment_confirmed', 'PAYMENT_REFUND_IN_PROGRESS', 'PAYMENT_PARTIALLY_REFUNDED', '']) {
      expect(classificar(e), e).not.toBe('liberar');
    }
  });

  it('todo evento assinado tem tratamento conhecido', () => {
    expect(new Set(EVENTOS_ASSINADOS).size).toBe(EVENTOS_ASSINADOS.length);
  });
});

describe('trimestral avulso pelo checkout', () => {
  let t;
  beforeEach(() => {
    t = bancoFalso();
    t.db.orders.push({ id: 'ord-tri', email: 'ana@x.com', plan: 'pro-trimestral', bill_id: 'chk_tri', user_id: USER });
  });

  it('a cobrança acha o pedido pelo checkout e libera 90 dias', async () => {
    const agora = new Date('2026-11-04T15:00:00Z');
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_tri', value: 89.9, billingType: 'PIX', checkoutSession: 'chk_tri' })), { ...t, agora });
    expect(r.status).toBe(200);
    expect(r.outcome).toMatch(/^liberado \(via checkout\)/);
    expect(t.db.paid).toHaveLength(1);
    expect(t.db.paid[0].expires_at.slice(0, 10)).toBe('2027-02-02');
    expect(t.db.paid[0].payment_ref).toBe('pay_tri');
    expect(t.db.orders[0].status).toBe('paid');
  });

  it('parcelado em 8x são 8 cobranças no Asaas: libera 90 dias UMA vez', async () => {
    const agora = new Date('2026-11-04T15:00:00Z');
    for (let n = 1; n <= 8; n++) {
      await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({
        id: `pay_parc_${n}`, installment: 'inst_1', installmentNumber: n, value: 11.24, checkoutSession: 'chk_tri',
      })), { ...t, agora });
    }
    expect(t.db.paid).toHaveLength(1);
    expect(t.db.paid[0].expires_at.slice(0, 10)).toBe('2027-02-02');
    expect(t.db.paid[0].payment_ref).toBe('parc:inst_1');
  });

  it('o e-mail que vale é o do PEDIDO, não o que a pessoa digitou no checkout', async () => {
    t.asaas.clientes.cus_1 = { id: 'cus_1', email: 'outro@digitado.com' };
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ value: 89.9, checkoutSession: 'chk_tri' })), t);
    expect(r.email).toBe('ana@x.com');
  });
});

describe('mensal no cartão', () => {
  let t;
  beforeEach(() => {
    t = bancoFalso();
    t.db.orders.push({ id: 'ord-m', email: 'ana@x.com', plan: 'pro-mensal', bill_id: 'chk_m', user_id: USER });
  });

  it('o vínculo grava a assinatura no pedido, e a renovação acha o dono por ela', async () => {
    await processarEvento({ id: 'e0', event: 'SUBSCRIPTION_CREATED', subscription: { id: 'sub_1', customer: 'cus_1', checkoutSession: 'chk_m' } }, t);
    expect(t.db.orders[0].provider_subscription_id).toBe('sub_1');

    await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m1', subscription: 'sub_1', checkoutSession: 'chk_m', dueDate: '2026-11-04' })), t);
    // Mês 2: a cobrança NÃO traz checkoutSession — só a assinatura.
    const r = await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m2', subscription: 'sub_1', dueDate: '2026-12-04' })), t);
    expect(r.outcome).toMatch(/via assinatura/);
    expect(t.db.paid).toHaveLength(2);
    expect(t.db.paid[1].expires_at.slice(0, 10)).toBe(`2027-01-0${4 + FOLGA_DIAS + 1}`);
  });

  it('o cartão manda CONFIRMED e RECEIVED da mesma cobrança: libera UMA vez', async () => {
    await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m1', checkoutSession: 'chk_m' })), t);
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_m1', checkoutSession: 'chk_m' })), t);
    expect(r.outcome).toBe('ja_liberado');
    expect(t.db.paid).toHaveLength(1);
  });

  it('sem a migration (vínculo perdido), a renovação acha o pedido pela API', async () => {
    const s = bancoFalso({ comMigration: false });
    s.db.orders.push({ id: 'ord-m', email: 'ana@x.com', plan: 'pro-mensal', bill_id: 'chk_m', user_id: USER });
    s.asaas.assinaturas.sub_1 = { id: 'sub_1', checkoutSession: 'chk_m' };
    const r = await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m2', subscription: 'sub_1' })), s);
    expect(r.outcome).toMatch(/via assinatura→checkout/);
    expect(s.db.paid).toHaveLength(1);
  });

  it('cancelar a assinatura NÃO tira o acesso já pago', async () => {
    await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m1', checkoutSession: 'chk_m', subscription: 'sub_1' })), t);
    const antes = t.db.paid[0].expires_at;
    const r = await processarEvento({ id: 'e9', event: 'SUBSCRIPTION_DELETED', subscription: { id: 'sub_1' } }, t);
    expect(r.outcome).toMatch(/^encerrado/);
    expect(t.db.paid[0].expires_at).toBe(antes);
    expect(t.db.orders[0].status).toBe('canceled');
  });

  it('estorno revoga na hora', async () => {
    await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_m1', checkoutSession: 'chk_m' })), t);
    const r = await processarEvento(ev('PAYMENT_REFUNDED', pagamento({ id: 'pay_m1', checkoutSession: 'chk_m' })), t);
    expect(r.outcome).toMatch(/^revogado/);
    expect(new Date(t.db.paid[0].expires_at) < new Date()).toBe(true);
    expect(t.db.orders[0].status).toBe('refunded');
  });
});

describe('mensal no Pix Automático', () => {
  it('o 1º Pix acha o pedido pelo cliente que a gente criou antes do QR', async () => {
    const t = bancoFalso();
    t.db.orders.push({ id: 'ord-p', email: 'ana@x.com', plan: 'pro-mensal', bill_id: 'aut_1', provider_customer_id: 'cus_pix', user_id: USER });
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_p1', customer: 'cus_pix', billingType: 'PIX' })), t);
    expect(r.outcome).toMatch(/via cliente/);
    expect(r.plano).toBe('pro-mensal');
  });

  it('a ativação da autorização grava a assinatura que vai gerar os próximos meses', async () => {
    const t = bancoFalso();
    t.db.orders.push({ id: 'ord-p', email: 'ana@x.com', plan: 'pro-mensal', bill_id: 'aut_1', user_id: USER });
    await processarEvento({
      id: 'e1', event: 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
      authorization: { id: 'aut_1', status: 'ACTIVE', customerId: 'cus_pix', subscriptionId: 'sub_pix' },
    }, t);
    expect(t.db.orders[0].provider_subscription_id).toBe('sub_pix');
    const r = await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ id: 'pay_p2', customer: 'cus_pix', subscription: 'sub_pix', billingType: 'PIX' })), t);
    expect(r.outcome).toMatch(/via assinatura/);
  });

  it('sem pedido nenhum, um cliente NOSSO (externalReference = usuário) ainda é reconhecido', async () => {
    const t = bancoFalso({ comMigration: false });
    t.asaas.clientes.cus_pix = { id: 'cus_pix', externalReference: USER, email: 'qualquer@x.com' };
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_p1', customer: 'cus_pix', value: 39.9 })), t);
    expect(r.email).toBe('ana@x.com');       // o e-mail da CONTA, não o do cadastro no Asaas
    expect(r.plano).toBe('pro-mensal');      // pelo valor exato
  });
});

describe('o que NÃO pode virar acesso', () => {
  it('cobrança de outro negócio na mesma conta do Asaas', async () => {
    const t = bancoFalso();
    // Cliente cadastrado à mão no painel: tem e-mail, não tem externalReference.
    t.asaas.clientes.cus_x = { id: 'cus_x', email: 'cliente@outronegocio.com', externalReference: null };
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_x', customer: 'cus_x', value: 89.9 })), t);
    expect(r.status).toBe(200);              // 200: não pode pausar a fila
    expect(r.outcome).toBe('pagamento_de_fora');
    expect(t.db.paid).toHaveLength(0);
  });

  it('estorno de cobrança de fora não revoga ninguém', async () => {
    const t = bancoFalso();
    t.db.paid.push({ email: 'ana@x.com', expires_at: '2099-01-01T00:00:00.000Z' });
    t.asaas.clientes.cus_x = { id: 'cus_x', email: 'ana@x.com', externalReference: null };
    const r = await processarEvento(ev('PAYMENT_REFUNDED', pagamento({ id: 'pay_x', customer: 'cus_x' })), t);
    expect(r.outcome).toBe('pagamento_de_fora');
    expect(t.db.paid[0].expires_at).toBe('2099-01-01T00:00:00.000Z');
  });

  it('cliente nosso, valor que não é de plano à venda (ex.: o semanal aposentado)', async () => {
    const t = bancoFalso();
    t.asaas.clientes.cus_pix = { id: 'cus_pix', externalReference: USER };
    const r = await processarEvento(ev('PAYMENT_RECEIVED', pagamento({ id: 'pay_s', customer: 'cus_pix', value: 19.9 })), t);
    expect(r.outcome).toBe('sem_plano');
    expect(t.db.paid).toHaveLength(0);
  });

  it('evento que a gente não trata é só registrado', async () => {
    const t = bancoFalso();
    const r = await processarEvento(ev('PAYMENT_CREATED', pagamento()), t);
    expect(r).toEqual({ status: 200, outcome: 'registrado' });
  });
});

describe('quando o banco falha', () => {
  it('é a única falha que devolve 500 (o Asaas tenta de novo)', async () => {
    const t = bancoFalso();
    t.db.orders.push({ id: 'ord-m', email: 'ana@x.com', plan: 'pro-mensal', bill_id: 'chk_m' });
    t.db.falharGravacao = true;
    const r = await processarEvento(ev('PAYMENT_CONFIRMED', pagamento({ checkoutSession: 'chk_m' })), t);
    expect(r.status).toBe(500);
    expect(r.outcome).toMatch(/^falha_ao_gravar/);
  });
});

describe('até quando a mensalidade vale', () => {
  it('vencimento seguinte + folga, até 23h59 de São Paulo', () => {
    const v = validadeDaAssinatura({ vencimento: '2026-11-04', vigente: null });
    expect(v).toBe(`2026-12-0${4 + FOLGA_DIAS + 1}T02:59:59.000Z`);
  });

  it('não acumula folga mês a mês (12 meses = 12 meses)', () => {
    let vigente = null;
    let venc = '2026-01-15';
    for (let i = 0; i < 12; i++) {
      vigente = validadeDaAssinatura({ vencimento: venc, vigente });
      venc = new Date(`${venc}T12:00:00Z`).toISOString().slice(0, 10);
      const [a, m, d] = venc.split('-').map(Number);
      venc = new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);
    }
    // Último pago: vencimento 15/12/2026 → vale até 15/01/2027 + folga.
    expect(vigente.slice(0, 10)).toBe(`2027-01-${15 + FOLGA_DIAS + 1}`);
  });

  it('nunca encurta quem ainda tem um trimestral em vigor', () => {
    const v = validadeDaAssinatura({ vencimento: '2026-11-04', vigente: '2027-03-01T00:00:00.000Z' });
    expect(v).toBe('2027-03-01T00:00:00.000Z');
  });

  it('31 de janeiro renova em fevereiro sem pular pra março', () => {
    expect(validadeDaAssinatura({ vencimento: '2026-01-31' }).slice(0, 10)).toBe(`2026-03-0${3 + 1}`);
  });
});

describe('plano pelo valor', () => {
  it('só valor exato de plano à venda', () => {
    expect(planoPeloValor(39.9)).toBe('pro-mensal');
    expect(planoPeloValor(89.9)).toBe('pro-trimestral');
    expect(planoPeloValor(19.9)).toBeNull();   // semanal: fora de venda
    expect(planoPeloValor(40)).toBeNull();
    expect(planoPeloValor(undefined)).toBeNull();
  });
});
