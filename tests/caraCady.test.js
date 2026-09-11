import { describe, it, expect } from 'vitest';
import { STATE_LAYERS } from '../lib/cady/cady-live.js';

/* O ROSTO DA CADY NA CONVERSA.

   Duas regras que o produto depende e que quebram em silêncio — a cara fica
   errada, nada estoura, e só se descobre olhando:

   1. Falando, o padrão é RIR. Era `talking` (olho de bolinha, boca esticando),
      que é a cara de quem emite som e não de quem gosta da conversa.
   2. Uma reação fica no rosto tempo suficiente pra ser lida. Abaixo de ~3s a
      pessoa vê "mudou alguma coisa" sem conseguir dizer o quê; uma reação nova
      não pode apagar a anterior antes disso, a não ser que seja mais forte.

   A decisão de rosto vive numa cadeia de ifs dentro de um componente React, que
   o vitest deste projeto não consegue montar (não há transform de JSX). Então a
   cadeia está replicada aqui como `caraDe` — e é replicação de verdade, com o
   risco que isso tem: mudou lá, muda aqui. Vale mesmo assim, porque a ORDEM das
   condições (reação > falando > mudo > ouvindo) é o tipo de coisa que alguém
   reordena sem perceber — e foi exatamente uma troca dessas que deixou a cara
   de mudo cobrindo toda a fala dela em produção. */

const REACAO_MS = 3800;
const FORCA = { elogiando: 1, corrigindo: 2 };

// A mesma cadeia de ConversationClient.js.
function caraDe({ connecting, active, muted, speaking, reacao }) {
  if (connecting) return 'curious';
  if (active && reacao === 'corrigindo') return speaking ? 'corrigindo_falando' : 'corrigindo';
  if (active && reacao === 'elogiando') return 'elogiando';
  if (active && speaking) return 'rindo';
  if (active && muted) return 'mudo';
  if (active) return 'ouvindo';
  return 'idle';
}

/* O slot de reação, como o componente o implementa: uma reação por vez, tempo
   mínimo, e dentro dele só entra quem é mais forte. */
function criarSlot() {
  let atual = null;
  let ate = 0;
  return {
    get: (agora) => (atual && agora < ate ? atual : (agora >= ate ? (atual = ate = 0, null) : atual)),
    reagir(tipo, agora) {
      if (!FORCA[tipo]) return;
      if (atual && agora < ate && FORCA[tipo] <= FORCA[atual]) return;
      atual = tipo;
      ate = agora + REACAO_MS;
    },
  };
}

describe('cara padrão', () => {
  it('falando, ela ri — não é mais a cara neutra de "talking"', () => {
    expect(caraDe({ active: true, speaking: true })).toBe('rindo');
  });

  it('o riso existe no catálogo, com olho de riso e boca aberta', () => {
    expect(STATE_LAYERS.rindo).toBeDefined();
    expect(STATE_LAYERS.rindo).toContain('eye-arc');   // olho fechado de riso
    expect(STATE_LAYERS.rindo).toContain('m-open');    // boca aberta (com língua)
  });

  it('calada ela escuta; muda e calada, ela mostra que está muda', () => {
    expect(caraDe({ active: true, speaking: false })).toBe('ouvindo');
    expect(caraDe({ active: true, muted: true, speaking: false })).toBe('mudo');
    expect(caraDe({ connecting: true })).toBe('curious');
    expect(caraDe({})).toBe('idle');
  });

  /* Este é o bug que estava em produção, e é por isso que ele tem teste.

     O microfone fecha SOZINHO enquanto ela fala (lib/conversaMute.js), então
     `muted` é verdadeiro durante toda a fala dela. Com `mudo` antes de
     `falando` na cadeia, a cara de mudo — olho de traço, boca reta — cobria
     cada frase, e nenhuma cara de fala chegava à tela. */
  it('falando ganha de mudo — senão o mute automático apaga a fala inteira', () => {
    expect(caraDe({ active: true, muted: true, speaking: true })).toBe('rindo');
    expect(caraDe({ active: true, muted: true, speaking: true, reacao: 'elogiando' })).toBe('elogiando');
  });
});

describe('reação dura o suficiente pra ser lida', () => {
  it('fica no rosto de 3 a 4 segundos', () => {
    const s = criarSlot();
    s.reagir('corrigindo', 0);
    expect(s.get(0)).toBe('corrigindo');
    expect(s.get(3000), 'aos 3s ainda tem que estar lá').toBe('corrigindo');
    expect(s.get(REACAO_MS - 1)).toBe('corrigindo');
    expect(s.get(REACAO_MS + 1), 'depois da trava, volta ao padrão').toBeNull();
    expect(REACAO_MS).toBeGreaterThanOrEqual(3000);
    expect(REACAO_MS).toBeLessThanOrEqual(4000);
  });

  it('uma reação igual ou mais fraca não apaga a que está no rosto', () => {
    const s = criarSlot();
    s.reagir('corrigindo', 0);
    s.reagir('elogiando', 500);   // mais fraca, no meio da trava
    expect(s.get(1000)).toBe('corrigindo');
    s.reagir('corrigindo', 1000); // igual, no meio da trava
    expect(s.get(3700), 'o relógio não pode ser reiniciado por uma igual').toBe('corrigindo');
    expect(s.get(3900)).toBeNull();
  });

  it('corrigir interrompe um elogio — perder uma correção custa mais', () => {
    const s = criarSlot();
    s.reagir('elogiando', 0);
    s.reagir('corrigindo', 200);
    expect(s.get(300)).toBe('corrigindo');
    // e ganha a trava inteira a partir de quando entrou
    expect(s.get(200 + REACAO_MS - 1)).toBe('corrigindo');
  });

  it('falando durante a correção, a boca continua se mexendo (cara própria)', () => {
    expect(caraDe({ active: true, speaking: true, reacao: 'corrigindo' })).toBe('corrigindo_falando');
    expect(caraDe({ active: true, speaking: false, reacao: 'corrigindo' })).toBe('corrigindo');
  });

  it('elogiar tem cara própria no catálogo — o estado existia e ninguém usava', () => {
    expect(caraDe({ active: true, speaking: true, reacao: 'elogiando' })).toBe('elogiando');
    expect(STATE_LAYERS.elogiando).toContain('eye-sparkle');
  });
});
