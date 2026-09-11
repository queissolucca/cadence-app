import { describe, it, expect } from 'vitest';
import { proximoPasso, TELAS_DE_PASSO } from '../lib/funil.js';

/* A ORDEM DO FUNIL É A REGRA MAIS CARA DE ERRAR NESTE REPO.

   Ela decide pra onde vai cada pessoa que tem conta, e erra em silêncio nas
   duas direções: uma linha fora de lugar tranca quem pagou do lado de fora, ou
   deixa entrar quem não pagou. Nenhum dos dois derruba build, e o segundo só
   aparece na fatura.

   Antes isto era uma cadeia de ifs dentro do middleware, onde teste nenhum
   alcança — e foi exatamente lá que um passo a mais (`/onboarding`) passou a
   pedir de novo o que a pessoa já tinha respondido nas 28 telas anteriores. */

describe('próximo passo do funil', () => {
  it('sem pagar, a única porta é o caixa', () => {
    expect(proximoPasso({ pago: false, nome: 'Lucca' })).toBe('/pagamento');
    expect(proximoPasso({ pago: false, nome: '' })).toBe('/pagamento');
    // O nome não pode atravessar o caixa: pedir antes de pagar inverte o funil.
    expect(proximoPasso({ pago: false })).toBe('/pagamento');
  });

  it('pagou e sem nome, pede o nome; com nome, libera o app', () => {
    expect(proximoPasso({ pago: true, nome: '' })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: '   ' })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: null })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: 'Lucca' })).toBeNull();
  });

  /* O passo que saiu. Este teste é o que impede alguém de reintroduzi-lo sem
     perceber: quem tem conta e não pagou vai pro caixa, e NUNCA pro
     questionário de idade/gênero — mesmo sem ter onboarding gravado, que é
     justamente o estado de quem acabou de confirmar o e-mail. */
  it('ninguém é mandado pro /onboarding, em estado nenhum', () => {
    const estados = [
      { pago: false, nome: '' },
      { pago: false, nome: 'Lucca' },
      { pago: true, nome: '' },
      { pago: true, nome: 'Lucca' },
      {},
    ];
    for (const e of estados) {
      expect(proximoPasso(e), JSON.stringify(e)).not.toBe('/onboarding');
    }
  });

  it('/onboarding continua sendo expulso em vez de abrir', () => {
    // Ele segue na lista de telas-de-passo justamente pra ser redirecionado:
    // link velho, favorito e e-mail antigo caem no passo certo.
    expect(TELAS_DE_PASSO).toContain('/onboarding');
    // E como `proximoPasso` nunca o devolve, o alvo nunca é igual ao pathname,
    // então o middleware sempre redireciona pra fora dele.
    for (const e of [{ pago: false }, { pago: true, nome: 'x' }]) {
      const alvo = proximoPasso(e) || '/v2';
      expect(alvo).not.toBe('/onboarding');
    }
  });

  it('as telas de passo são exatamente as que só valem na vez delas', () => {
    expect(TELAS_DE_PASSO).toEqual(['/onboarding', '/v2/onboarding', '/pagamento']);
  });
});
