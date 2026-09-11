import { describe, it, expect } from 'vitest';
import { diagnosticoDe } from '../lib/comecar/diagnostico.js';

/* A tela de diagnóstico (/comecar → 'diagnostico') devolve pra pessoa o que ela
   acabou de responder, e é a primeira vez no funil em que o produto afirma ter
   ENTENDIDO alguma coisa. Uma frase errada aqui não quebra nada — ela só faz o
   app parecer que não estava prestando atenção, que é pior.

   O que estes testes seguram:

   1. Toda resposta possível de "o que mais te trava" tem frase própria. A
      versão anterior interpolava o rótulo do botão, então opção nova aparecia
      sozinha na tela, sem ninguém escrever nada — em minúscula e no meio de uma
      frase que não a esperava. Aqui, opção nova sem frase FALHA o teste.
   2. A prioridade do "zero em voz alta". Ela é uma decisão de produto, não um
      detalhe: sem ela, quem nunca abre a boca leria um diagnóstico sobre
      vocabulário.
   3. A frase nunca sai vazia — nem sem resposta nenhuma, nem com resposta que
      não existe mais (alguém que ficou com localStorage de uma versão antiga do
      funil). */

// As opções como a tela Bloqueio as oferece hoje. Se a lista de lá mudar, este
// array tem que mudar junto — e é esse o ponto do teste.
const BLOQUEIOS = [
  'Vergonha de errar',
  'Falta de repertório',
  'Falta de prática',
  'Congelo na hora',
];

// Idem, da tela Hoje.
const VOZ_ALTA = ['0', '-10', '10-60', '60+'];

describe('frase do diagnóstico', () => {
  it('toda opção de bloqueio tem frase escrita, e cada uma é diferente', () => {
    const vistas = new Set();
    for (const bloqueio of BLOQUEIOS) {
      const { antes, forte } = diagnosticoDe({ bloqueio, hoje: '-10' });
      expect(antes, `"${bloqueio}" sem começo de frase`).toBeTruthy();
      expect(forte, `"${bloqueio}" sem destaque`).toBeTruthy();
      // Rótulo de botão devolvido cru é exatamente o defeito que isto conserta.
      expect(forte.toLowerCase()).not.toBe(bloqueio.toLowerCase());
      vistas.add(`${antes}${forte}`);
    }
    // "Falta de prática" e o padrão são a MESMA frase de propósito, então 3
    // frases distintas pra 4 opções é o esperado.
    expect(vistas.size).toBeGreaterThanOrEqual(3);
  });

  it('quem não fala nada em voz alta ouve sobre praticar, não sobre o resto', () => {
    for (const bloqueio of BLOQUEIOS) {
      const { forte } = diagnosticoDe({ bloqueio, hoje: '0' });
      expect(forte, `hoje=0 com bloqueio "${bloqueio}"`).toBe('não conseguir praticar todo dia');
    }
  });

  it('quem já fala alguma coisa ouve sobre o próprio bloqueio', () => {
    for (const hoje of VOZ_ALTA.filter((h) => h !== '0')) {
      const { forte } = diagnosticoDe({ bloqueio: 'Vergonha de errar', hoje });
      expect(forte, `hoje=${hoje}`).toBe('vergonha de errar com estranhos');
    }
  });

  it('nunca devolve frase vazia', () => {
    for (const entrada of [undefined, {}, { bloqueio: '' }, { bloqueio: 'opção que não existe mais' }, { hoje: '60+' }]) {
      const r = diagnosticoDe(entrada);
      expect(r.antes, `entrada ${JSON.stringify(entrada)}`).toBeTruthy();
      expect(r.forte, `entrada ${JSON.stringify(entrada)}`).toBeTruthy();
    }
  });

  it('a frase montada lê como frase, não como rótulo colado', () => {
    const { antes, forte } = diagnosticoDe({ bloqueio: 'Falta de repertório', hoje: '10-60' });
    expect(`${antes}${forte}!`).toBe('Sua trava é não achar as palavras na hora!');
  });
});
