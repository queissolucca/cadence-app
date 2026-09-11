import { describe, it, expect } from 'vitest';
import { resumoDaMemoria } from '../lib/comecar/resumo.js';

/* A linha de memória da tela de plano é a prova de que a Cady reparou no que a
   pessoa respondeu — é o diferencial que o produto vende, aparecendo pela
   primeira vez.

   O risco aqui não é quebrar: é MENTIR ou ficar sem graça. Uma frase montada
   com interpolação direta escreveria "objetivo de undefined, 5 minutos por dia"
   pra quem chegou com resposta faltando, e isso acontece de verdade — quem
   volta do Google no meio do fluxo, quem tem localStorage de uma versão antiga,
   quem pulou telas pelo modo dev.

   Então o que se testa é o comportamento nos buracos, não o caso feliz. */

describe('resumo da memória', () => {
  it('junta o que a pessoa respondeu numa frase que lê como frase', () => {
    const r = resumoDaMemoria({ objetivo: 'Carreira', min: 10, horario: 'manha', temas: ['Viagem', 'Trabalho'] });
    expect(r).toBe('Quer inglês pra carreira, 10 minutos por dia de manhã e gosta de falar sobre viagem e trabalho');
  });

  it('nunca escreve undefined, nem com o estado vazio', () => {
    for (const a of [undefined, {}, { objetivo: 'Carreira' }, { min: 5 }, { temas: [] }, { temas: ['Comida'] }, { horario: 'noite' }]) {
      const r = resumoDaMemoria(a);
      expect(r, JSON.stringify(a)).toBeTruthy();
      expect(r.toLowerCase(), JSON.stringify(a)).not.toContain('undefined');
      expect(r.toLowerCase(), JSON.stringify(a)).not.toContain('null');
      expect(r.toLowerCase(), JSON.stringify(a)).not.toContain('nan');
      // Nada de vírgula nem de "e" SOLTO sobrando de um pedaço que não entrou.
      // (`\se` e não `e`: "Treina à noite" termina em e, e está certo.)
      expect(r.trim(), JSON.stringify(a)).not.toMatch(/(,|\se)$/);
    }
  });

  it('sem resposta nenhuma, promete guardar em vez de fingir que já guardou', () => {
    const r = resumoDaMemoria({});
    expect(r).toMatch(/vou guardando/i);
  });

  it('opção de resposta desconhecida é ignorada, não impressa crua', () => {
    const r = resumoDaMemoria({ objetivo: 'Sei lá', horario: 'madrugada', min: 10 });
    expect(r).not.toMatch(/Sei lá|madrugada/);
    expect(r).toContain('10 minutos por dia');
  });

  it('não vira parágrafo: o cartão tem duas linhas', () => {
    const r = resumoDaMemoria({
      objetivo: 'Carreira', min: 15, horario: 'noite',
      temas: ['Viagem', 'Trabalho', 'Comida', 'Música', 'Notícias'],
      nivel: 'zero', hoje: '0',
    });
    // No máximo dois temas, e no máximo quatro pedaços no total.
    expect(r).not.toContain('Comida');
    expect(r.split(',').length).toBeLessThanOrEqual(4);
  });

  it('quem não fala em voz alta hoje aparece na memória uma vez só', () => {
    const r = resumoDaMemoria({ min: 10, nivel: 'zero', hoje: '0' });
    expect(r.match(/quase não fala em voz alta/g)).toHaveLength(1);
  });
});
