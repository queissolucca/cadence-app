import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature, maxInstallmentsFor, classifyEvent, threeMonthsFrom, metodoRecusado } from '../lib/payments.js';
import { getPlan } from '../lib/plans.js';

describe('verifyWebhookSignature (HMAC do webhook)', () => {
  const secret = 's3cr3t-abacate';
  const raw = JSON.stringify({ id: 'log_1', event: 'checkout.completed' });
  const sig = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');

  it('assinatura válida passa', () => {
    expect(verifyWebhookSignature(raw, sig, secret)).toBe(true);
  });
  it('assinatura inválida é rejeitada', () => {
    expect(verifyWebhookSignature(raw, 'deadbeef', secret)).toBe(false);
  });
  it('secret errado é rejeitado', () => {
    expect(verifyWebhookSignature(raw, sig, 'outro-secret')).toBe(false);
  });
  it('corpo adulterado é rejeitado (assinatura não bate)', () => {
    expect(verifyWebhookSignature(raw + ' ', sig, secret)).toBe(false);
  });
  it('sem assinatura é rejeitada', () => {
    expect(verifyWebhookSignature(raw, '', secret)).toBe(false);
  });
});

describe('classifyEvent (roteamento de eventos)', () => {
  it('checkout.completed → grant (libera acesso)', () => {
    expect(classifyEvent('checkout.completed')).toBe('grant');
  });
  it('subscription.renewed → grant', () => {
    expect(classifyEvent('subscription.renewed')).toBe('grant');
  });
  it('checkout.refunded → revoke', () => {
    expect(classifyEvent('checkout.refunded')).toBe('revoke');
  });
  it('checkout.disputed → revoke', () => {
    expect(classifyEvent('checkout.disputed')).toBe('revoke');
  });
  it('subscription.cancelled → cancel (não revoga já)', () => {
    expect(classifyEvent('subscription.cancelled')).toBe('cancel');
  });
  it('billing.paid → grant (PIX do link estático do AbacatePay)', () => {
    expect(classifyEvent('billing.paid')).toBe('grant');
  });
  it('pix.paid → grant', () => {
    expect(classifyEvent('pix.paid')).toBe('grant');
  });
  it('billing.refunded → revoke', () => {
    expect(classifyEvent('billing.refunded')).toBe('revoke');
  });
  it('evento desconhecido → ignore', () => {
    expect(classifyEvent('pix.something')).toBe('ignore');
  });
});

describe('maxInstallmentsFor (parcela mínima R$10, teto 12)', () => {
  it('R$ 89,90 → 8 parcelas', () => expect(maxInstallmentsFor(8990)).toBe(8));
  it('valor baixo → mínimo 1', () => expect(maxInstallmentsFor(500)).toBe(1));
  it('valor alto → teto 12', () => expect(maxInstallmentsFor(9999999)).toBe(12));
});

describe('getPlan (preço/produto vêm do SERVIDOR, não do cliente)', () => {
  it('plano válido tem preço definido no servidor', () => {
    expect(getPlan('pro-trimestral').price).toBe(8990);
  });
  it('plano inexistente → null (cliente não injeta preço/produto)', () => {
    expect(getPlan('gratis-pirata')).toBeNull();
    expect(getPlan(undefined)).toBeNull();
  });
});

describe('threeMonthsFrom', () => {
  it('soma 3 meses', () => {
    const base = new Date('2026-01-15T00:00:00.000Z');
    expect(threeMonthsFrom(base).slice(0, 7)).toBe('2026-04');
  });
});

describe('metodoRecusado (qual método o AbacatePay não aceita)', () => {
  it('pega o caso real que derrubava o botão de pagar', () => {
    // Mensagem literal que a produção estava recebendo, com 502 no cliente.
    expect(metodoRecusado('CARD is not available for this store')).toBe('CARD');
  });

  it('pega o caso simétrico', () => {
    expect(metodoRecusado('PIX is not available for this store')).toBe('PIX');
  });

  it('não confunde método com palavra que só contém o nome', () => {
    // Sem o \b, "CARD" casaria dentro de CARDHOLDER e a gente removeria o
    // método errado do pedido.
    expect(metodoRecusado('CARDHOLDER_NAME is not available')).toBe(null);
    expect(metodoRecusado('DISCARDED is not available')).toBe(null);
  });

  it('erro que não é sobre método indisponível sobe, não vira retentativa', () => {
    for (const m of [
      'AbacatePay respondeu HTTP 401',
      'product prod_x not found',
      'invalid externalId',
      '',
      null,
      undefined,
    ]) {
      expect(metodoRecusado(m)).toBe(null);
    }
  });

  it('só considera os métodos que estavam no pedido', () => {
    // Se já tiramos CARD e o erro volta falando de CARD, não há o que remover.
    expect(metodoRecusado('CARD is not available for this store', ['PIX'])).toBe(null);
  });

  it('aceita as outras formas que a API usa pra dizer o mesmo', () => {
    expect(metodoRecusado('PIX unavailable')).toBe('PIX');
    expect(metodoRecusado('CARD is disabled for this account')).toBe('CARD');
  });
});
