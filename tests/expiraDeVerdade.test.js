import { describe, it, expect } from 'vitest';
import { lerFonte as ler } from './fonte.js';
import { getPlan } from '../lib/plans.js';
import { validadeEmDias } from '../lib/payments.js';

/* SETE DIAS PRECISAM MESMO ACABAR.

   Enquanto todo plano durava três meses, "acesso sem data = permanente" era um
   atalho inofensivo: servia pras contas liberadas à mão. Com o plano semanal,
   toda linha sem `expires_at` virou uma assinatura vitalícia de R$ 19,90 — e
   havia DOIS caminhos que produziam exatamente isso, um na escrita e um na
   leitura. Nenhum dos dois aparecia em teste. */

const LEITORES = [
  ['middleware.js', 'o portão das páginas e das rotas de API'],
  ['lib/sessaoServidor.js', 'o cadeado da aba Trilha'],
  ['app/api/checkout/status/route.js', 'o polling do /obrigado'],
];

describe('nenhum caminho grava acesso sem data', () => {
  const wh = ler('app/api/webhooks/abacatepay/route.js');

  it('o último degrau da degradação mantém o expires_at', () => {
    /* Era `upsert({ email })`. O que pode cair é o cosmético — paid_at,
       amount, method. A data, não: sem ela a linha lê como permanente. */
    const upserts = [...wh.matchAll(/paid_emails'\)\.upsert\(\{([^}]*)\}/g)].map((m) => m[1]);
    expect(upserts.length, 'os upserts sumiram do webhook').toBeGreaterThan(0);
    for (const campos of upserts) {
      expect(campos, `upsert sem expires_at: {${campos.trim()}}`).toContain('expires_at');
    }
  });

  it('e o primeiro grava o objeto completo, que já tem a data', () => {
    expect(wh).toMatch(/expires_at: validadeEmDias\(dias\)/);
  });
});

describe('nenhum leitor libera sem olhar a data', () => {
  it.each(LEITORES)('%s exige expires_at na consulta', (arquivo) => {
    const src = ler(arquivo);
    /* O fallback `select('email')` sozinho tratava a linha como válida — então
       um erro QUALQUER na consulta principal virava acesso liberado. */
    expect(src, `${arquivo} voltou a consultar só o email`)
      .not.toMatch(/select\('email'\)\s*\.eq\('email'/);
    expect(src).toMatch(/expires_at/);
  });

  it.each(LEITORES)('%s compara a data com agora', (arquivo) => {
    expect(ler(arquivo)).toMatch(/expires_at\) > new Date\(\)/);
  });
});

describe('a conta dos sete dias', () => {
  it('expira uma semana depois do pagamento', () => {
    const pago = new Date('2026-09-18T15:00:00Z');
    const vence = validadeEmDias(getPlan('pro-semanal').dias, pago);
    expect(vence.slice(0, 10)).toBe('2026-09-25');
  });

  it('no oitavo dia já está no passado', () => {
    const pago = new Date('2026-09-18T15:00:00Z');
    const vence = new Date(validadeEmDias(getPlan('pro-semanal').dias, pago));
    const oitavo = new Date('2026-09-26T15:00:00Z');
    // É esta a comparação que os três leitores fazem.
    expect(vence > oitavo).toBe(false);
  });

  it('e dentro da semana ainda vale', () => {
    const pago = new Date('2026-09-18T15:00:00Z');
    const vence = new Date(validadeEmDias(getPlan('pro-semanal').dias, pago));
    expect(vence > new Date('2026-09-24T15:00:00Z')).toBe(true);
  });
});
