import { describe, it, expect } from 'vitest';
import { aoTocarMute, decidirMute } from '../lib/conversaMute.js';
import { STATE_LAYERS } from '../lib/cady/cady-live.js';
import { EXPRESSIONS } from '../lib/cady/cady.js';

/* Roda a máquina como ela roda de verdade: uma sequência de eventos, cada um
   levando o estado adiante. Testar as decisões soltas esconderia justamente os
   bugs de "quem era o dono do mudo três eventos atrás". */
function sessao(passos) {
  let mudo = false, nosso = false, assumido = false, ativo = true, falando = false;
  const trilha = [];
  for (const p of passos) {
    if (p === 'fala') falando = true;
    else if (p === 'cala') falando = false;
    else if (p === 'encerra') { ativo = false; falando = false; }
    else if (p === 'toca') {
      const d = aoTocarMute({ mudo, falando });
      mudo = d.mudar; nosso = d.nosso; assumido = d.assumido;
      trilha.push(mudo ? 'mudo' : 'aberto');
      continue;
    }
    const d = decidirMute({ ativo, falando, mudo, nosso, assumido });
    nosso = d.nosso; assumido = d.assumido;
    if (d.mudar !== null) mudo = d.mudar;
    trilha.push(mudo ? 'mudo' : 'aberto');
  }
  return { mudo, nosso, trilha };
}

describe('microfone durante a conversa', () => {
  it('fecha quando ela fala e abre quando ela para', () => {
    expect(sessao(['fala', 'cala']).trilha).toEqual(['mudo', 'aberto']);
  });

  it('aguenta ela falar várias vezes seguidas', () => {
    expect(sessao(['fala', 'cala', 'fala', 'cala', 'fala', 'cala']).trilha)
      .toEqual(['mudo', 'aberto', 'mudo', 'aberto', 'mudo', 'aberto']);
  });

  it('a pessoa desmuta no meio da fala pra interromper, e continua aberto', () => {
    // fala (fecha) → toca (abre pra interromper) → ela continua falando →
    // ela para. Em nenhum momento a gente fecha de novo.
    const r = sessao(['fala', 'toca', 'fala', 'cala']);
    expect(r.trilha).toEqual(['mudo', 'aberto', 'aberto', 'aberto']);
    expect(r.mudo).toBe(false);
  });

  it('quem se mutou por conta própria não é desmutado por nós', () => {
    // Este é o caso que a versão ingênua erra: a pessoa se muta no silêncio, a
    // Cady fala e para, e o microfone abriria sozinho — passando a ouvir alguém
    // que tinha pedido pra não ser ouvido.
    const r = sessao(['toca', 'fala', 'cala']);
    expect(r.trilha).toEqual(['mudo', 'mudo', 'mudo']);
    expect(r.mudo).toBe(true);
  });

  it('mutou sozinho, depois desmutou sozinho: volta ao fluxo normal', () => {
    const r = sessao(['toca', 'toca', 'fala', 'cala']);
    expect(r.trilha).toEqual(['mudo', 'aberto', 'mudo', 'aberto']);
  });

  it('encerrar a sessão devolve o mudo pra ninguém', () => {
    const r = sessao(['fala', 'encerra']);
    expect(r.nosso).toBe(false);
  });

  it('sessão fechada não mexe no microfone', () => {
    expect(decidirMute({ ativo: false, falando: true, mudo: false, nosso: true, assumido: true }).mudar).toBe(null);
  });
});

describe('rosto da Cady', () => {
  const estadosDaConversa = ['idle', 'ouvindo', 'talking', 'mudo', 'corrigindo', 'corrigindo_falando'];

  it('todo estado usado pela conversa tem camadas declaradas', () => {
    for (const e of estadosDaConversa) {
      expect(STATE_LAYERS[e], `faltou ${e}`).toBeTruthy();
      expect(STATE_LAYERS[e].length).toBeGreaterThan(0);
    }
  });

  it('as caras de correção trazem sobrancelha, que é o que lê como brava', () => {
    expect(STATE_LAYERS.corrigindo).toContain('brows');
    expect(STATE_LAYERS.corrigindo_falando).toContain('brows');
  });

  it('as caras normais NÃO trazem sobrancelha', () => {
    for (const e of ['idle', 'ouvindo', 'talking', 'mudo']) {
      expect(STATE_LAYERS[e], `${e} não devia franzir`).not.toContain('brows');
    }
  });

  it('o catálogo tem as 18 da imagem 1 e as bravas da imagem 2', () => {
    const nomes = Object.keys(EXPRESSIONS);
    expect(nomes.length).toBeGreaterThanOrEqual(27);
    // uma de cada extremo, pra pegar renomeação acidental
    expect(nomes).toContain('repouso');
    expect(nomes).toContain('dormindo');
    expect(nomes).toContain('explodindo');
  });

  it('só as bravas avermelham, e a escala vai de leve a explodindo', () => {
    expect(EXPRESSIONS.repouso.heat).toBeUndefined();
    expect(EXPRESSIONS.rindo.heat).toBeUndefined();
    expect(EXPRESSIONS.incomodada.heat).toBeLessThan(EXPRESSIONS.explodindo.heat);
    expect(EXPRESSIONS.explodindo.heat).toBe(1);
  });
});
