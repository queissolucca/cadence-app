import { describe, it, expect } from 'vitest';
import {
  somarMeses, dataSP, dataHoraSP, documentoValido, modalidadeDoCheckout,
  corpoCheckoutAsaas, corpoAutorizacaoPix, contratoDoPedido,
} from '../lib/asaasPedido.js';
import { getPlan } from '../lib/plans.js';
import { ambienteDaChave } from '../lib/asaas.js';

const MENSAL = getPlan('pro-mensal');
const TRIMESTRAL = getPlan('pro-trimestral');
const ORDER = '3f2b8c1e-5a4d-4e2f-9b1a-7c6d5e4f3a2b';

describe('somar meses sem pular mês', () => {
  it('31 de janeiro + 1 mês é o último dia de fevereiro, não 3 de março', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29'); // bissexto
  });
  it('vira o ano', () => {
    expect(somarMeses('2026-12-15', 1)).toBe('2027-01-15');
  });
  it('dia que existe nos dois meses fica igual', () => {
    expect(somarMeses('2026-11-04', 1)).toBe('2026-12-04');
  });
});

describe('a data é a de São Paulo', () => {
  it('00h30 em SP ainda é o dia anterior em relação ao UTC de 03h30', () => {
    // 2026-11-05T02:30Z = 04/11 às 23h30 em SP.
    expect(dataSP(new Date('2026-11-05T02:30:00Z'))).toBe('2026-11-04');
    expect(dataHoraSP(new Date('2026-11-05T02:30:00Z'))).toBe('2026-11-04 23:30:00');
  });
});

describe('CPF e CNPJ', () => {
  it('aceita CPF válido, com ou sem máscara', () => {
    expect(documentoValido('529.982.247-25')).toBe(true);
    expect(documentoValido('52998224725')).toBe(true);
  });
  it('recusa dígito errado e sequência repetida', () => {
    expect(documentoValido('529.982.247-24')).toBe(false);
    expect(documentoValido('111.111.111-11')).toBe(false);
    expect(documentoValido('123')).toBe(false);
  });
  it('aceita CNPJ válido', () => {
    expect(documentoValido('11.222.333/0001-81')).toBe(true);
    expect(documentoValido('11.222.333/0001-80')).toBe(false);
  });
});

describe('o ambiente sai do prefixo da chave', () => {
  it('prod e sandbox', () => {
    expect(ambienteDaChave('$aact_prod_abc')).toBe('producao');
    expect(ambienteDaChave('$aact_hmlg_abc')).toBe('sandbox');
    expect(ambienteDaChave('')).toBe('sandbox');
  });
});

describe('que checkout cada plano abre', () => {
  it('o mensal é assinatura e SÓ no cartão — o Asaas recusa Pix em RECURRENT', () => {
    expect(modalidadeDoCheckout(MENSAL)).toEqual({ billingTypes: ['CREDIT_CARD'], chargeTypes: ['RECURRENT'] });
  });
  it('o trimestral é avulso, Pix ou cartão, à vista ou parcelado', () => {
    expect(modalidadeDoCheckout(TRIMESTRAL)).toEqual({
      billingTypes: ['PIX', 'CREDIT_CARD'], chargeTypes: ['DETACHED', 'INSTALLMENT'],
    });
  });
});

describe('o corpo do checkout', () => {
  const agora = new Date('2026-11-04T15:00:00Z');
  const base = { orderId: ORDER, baseUrl: 'https://heycady.com', agora };

  it('trimestral: parcela em até 8x e não leva bloco de assinatura', () => {
    const c = corpoCheckoutAsaas({ ...base, plan: TRIMESTRAL, planId: 'pro-trimestral' });
    expect(c.installment).toEqual({ maxInstallmentCount: 8 });
    expect(c.subscription).toBeUndefined();
    expect(c.items[0].value).toBe(89.9);
  });

  it('mensal: assinatura mensal começando agora, sem parcelamento', () => {
    const c = corpoCheckoutAsaas({ ...base, plan: MENSAL, planId: 'pro-mensal' });
    expect(c.subscription).toEqual({ cycle: 'MONTHLY', nextDueDate: '2026-11-04 12:00:00' });
    expect(c.installment).toBeUndefined();
    expect(c.items[0].value).toBe(39.9);
  });

  it('carrega o id do pedido — é ele que diz ao webhook de quem é', () => {
    const c = corpoCheckoutAsaas({ ...base, plan: MENSAL, planId: 'pro-mensal' });
    expect(c.externalReference).toBe(ORDER);
  });

  it('tem tudo o que o schema exige (billingTypes, chargeTypes, callback, items com imagem)', () => {
    const c = corpoCheckoutAsaas({ ...base, plan: TRIMESTRAL, planId: 'pro-trimestral' });
    expect(c.billingTypes.length).toBeGreaterThan(0);
    expect(c.chargeTypes.length).toBeGreaterThan(0);
    expect(c.callback.successUrl).toBe('https://heycady.com/obrigado');
    expect(c.callback.cancelUrl).toBeTruthy();
    const it0 = c.items[0];
    for (const k of ['imageBase64', 'name', 'quantity', 'value']) expect(it0[k], k).toBeTruthy();
    expect(c.minutesToExpire).toBeGreaterThanOrEqual(10);
    expect(c.minutesToExpire).toBeLessThanOrEqual(1440);
  });

  it('pré-preenche nome e e-mail só quando tem, e nunca CPF', () => {
    const com = corpoCheckoutAsaas({ ...base, plan: MENSAL, planId: 'pro-mensal', cliente: { nome: 'Ana', email: 'ana@x.com' } });
    expect(com.customerData).toEqual({ name: 'Ana', email: 'ana@x.com' });
    const sem = corpoCheckoutAsaas({ ...base, plan: MENSAL, planId: 'pro-mensal', cliente: null });
    expect(sem.customerData).toBeUndefined();
  });
});

describe('a autorização do Pix Automático', () => {
  const agora = new Date('2026-01-31T15:00:00Z');
  const a = corpoAutorizacaoPix({ plan: MENSAL, customerId: 'cus_1', orderId: ORDER, agora });

  it('o QR paga o 1º mês agora e o débito automático começa no mês seguinte', () => {
    // startDate hoje faria a pessoa pagar duas vezes no mesmo dia.
    expect(a.immediateQrCode.originalValue).toBe(39.9);
    expect(a.startDate).toBe('2026-02-28');
  });

  it('o Asaas gera as cobranças sozinho, com valor fixo e retentativa', () => {
    expect(a.paymentCreationMode).toBe('SUBSCRIPTION');
    expect(a.value).toBe(39.9); // obrigatório no modo SUBSCRIPTION
    expect(a.frequency).toBe('MONTHLY');
    expect(a.retryPolicy).toBe('ALLOW_THREE_IN_SEVEN_DAYS');
  });

  it('tem os campos obrigatórios do schema', () => {
    for (const k of ['frequency', 'contractId', 'startDate', 'customerId', 'immediateQrCode']) expect(a[k], k).toBeTruthy();
    expect(a.immediateQrCode.expirationSeconds).toBeGreaterThan(0);
  });

  it('o contrato é o id do pedido, sem hífens e dentro de 35 caracteres', () => {
    expect(contratoDoPedido(ORDER)).toBe(ORDER.replace(/-/g, ''));
    expect(contratoDoPedido(ORDER).length).toBeLessThanOrEqual(35);
  });
});
