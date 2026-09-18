import { describe, it, expect } from 'vitest';
import { PLANS, getPlan, centavosPorDia } from '../lib/plans.js';
import { validadeEmDias } from '../lib/payments.js';
import { lerFonte as ler } from './fonte.js';

/* DOIS PLANOS NO AR, E O PERIGO NÃO É A TELA — É A VALIDADE.

   Até aqui existia um plano só, e o webhook gravava `threeMonthsFrom()` com os
   três meses no NOME da função. Acrescentar um plano de 7 dias sem tocar nisso
   daria 90 dias de acesso por R$ 19,90 — e esse erro não apareceria em tela
   nenhuma, em log nenhum. Só na fatura, meses depois.

   É esse o buraco que os testes abaixo cercam. */

describe('todo plano diz quanto tempo vale', () => {
  it.each(Object.keys(PLANS))('%s declara dias', (id) => {
    // Sem `dias`, o webhook cai no padrão de 90 — e um plano de uma semana
    // passa a valer um trimestre sem ninguém notar.
    expect(getPlan(id).dias, `${id} não diz quantos dias vale`).toBeGreaterThan(0);
  });

  it('o semanal vale 7 dias e o trimestral 90', () => {
    expect(getPlan('pro-semanal').dias).toBe(7);
    expect(getPlan('pro-trimestral').dias).toBe(90);
  });

  it('o preço do semanal é R$ 19,90', () => {
    expect(getPlan('pro-semanal').price).toBe(1990);
  });
});

describe('o webhook usa os dias DO PLANO comprado', () => {
  const wh = ler('app/api/webhooks/abacatepay/route.js');

  it('não existe mais duração fixa no webhook', () => {
    expect(wh, 'a validade voltou a ser fixa').not.toContain('threeMonthsFrom');
  });

  it('a duração vem do plano da ordem, contada a partir do que sobrou', () => {
    expect(wh).toContain('getPlan(pedido?.plan)');
    /* Ganhou um segundo argumento: de QUANDO contar. Sem ele, comprar uma
       semana faltando cinco dias faria a pessoa perder esses cinco. */
    expect(wh).toMatch(/validadeEmDias\(dias, desde\)/);
  });

  it('sem plano conhecido, mantém os 90 dias de antes', () => {
    /* Pagamento pelo link estático antigo não cria ordem. Errar pra mais num
       caso raro é melhor do que cortar o acesso de quem pagou. */
    expect(wh).toMatch(/plano\?\.dias \|\| 90/);
  });
});

describe('a conta por dia', () => {
  it('bate com o que o resto do produto já diz', () => {
    /* O card de preço e o paywall dizem R$ 0,99 em todo lugar. 8990/90 é
       99,888… — arredondado viraria R$ 1,00, e dois números pro mesmo plano na
       mesma sessão fazem a pessoa parar e reler em vez de comprar. */
    expect(centavosPorDia(getPlan('pro-trimestral'))).toBe(99);
  });

  it('o semanal sai a R$ 2,84 por dia', () => {
    expect(centavosPorDia(getPlan('pro-semanal'))).toBe(284);
  });

  it('nunca infla o preço por dia', () => {
    // Floor: o lado certo pra errar num número que a pessoa usa pra decidir.
    for (const id of Object.keys(PLANS)) {
      const p = getPlan(id);
      expect(centavosPorDia(p) * p.dias).toBeLessThanOrEqual(p.price);
    }
  });
});

describe('a validade conta em dias de verdade', () => {
  it('7 dias atravessam a virada do mês', () => {
    expect(validadeEmDias(7, new Date('2026-01-28T12:00:00Z')).slice(0, 10)).toBe('2026-02-04');
  });

  it('e a do ano', () => {
    expect(validadeEmDias(7, new Date('2026-12-29T12:00:00Z')).slice(0, 10)).toBe('2027-01-05');
  });
});

describe('o popup não tem a sua própria tabela de preços', () => {
  const pop = ler('components/v2/PortaoPago.js');

  it('os valores vêm de plans.js, que é o que o servidor cobra', () => {
    /* Duas listas de preço divergem no dia em que uma muda — e a que a pessoa
       leu não seria a que ela pagou. */
    expect(pop).toContain("from '../../lib/plans'");
    expect(pop).toContain('centavosPorDia');
    expect(pop, 'preço escrito à mão no popup').not.toMatch(/R\$\s*19,90/);
    expect(pop, 'preço escrito à mão no popup').not.toMatch(/R\$\s*89,90/);
  });

  it('oferece os dois planos', () => {
    expect(pop).toContain("'pro-semanal'");
    expect(pop).toContain("'pro-trimestral'");
  });

  it('sabe dizer quando um plano ainda não existe no AbacatePay', () => {
    /* `plan_not_configured` tem causa e conserto conhecidos. Dizer "tenta de
       novo" aí manda a pessoa repetir uma ação que nunca vai funcionar. */
    expect(pop).toContain('plan_not_configured');
  });
});

describe('o produto semanal existe no script de criação', () => {
  it('o setup cria os dois', () => {
    // Sem isso o plano aparece na tela e o checkout devolve plan_not_configured.
    const script = ler('scripts/abacate-setup-products.mjs');
    expect(script).toContain('ABACATEPAY_PROD_PRO_SEMANAL');
    expect(script).toContain('cadence-pro-7d');
  });
});
