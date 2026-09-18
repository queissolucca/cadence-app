import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import postcss from 'postcss';

/* O BUG QUE ESTE ARQUIVO EXISTE PRA IMPEDIR.

   A folha tinha um `#phone.dark` PENDURADO, sem bloco `{}`, logo acima da
   regra do #view. O parser emenda os dois: o seletor real virava
   `#phone.dark #view`. Enquanto o #phone tinha a classe `dark` isso era
   invisível — a regra casava e tudo funcionava. Quando a classe saiu, na
   virada pro tema claro, o bloco INTEIRO do #view morreu: o padding lateral
   (texto colado nas duas bordas) e, pior, `flex:1; min-height:0;
   overflow-y:auto` — a rolagem.

   Um seletor pendurado não quebra build, não quebra lint e não quebra teste
   nenhum. Ele espera. Por isso a asserção aqui é sobre o que o PARSER vê, e
   não sobre o texto do arquivo. */

const raiz = fileURLToPath(new URL('../', import.meta.url));
const css = readFileSync(join(raiz, 'app/comecar/comecar.css'), 'utf8');
const folha = postcss.parse(css);

const seletores = [];
folha.walkRules((r) => seletores.push({ sel: r.selector, linha: r.source.start.line }));

describe('a folha faz o que está escrito nela', () => {
  it('nenhum seletor foi emendado com o de cima', () => {
    // Uma quebra de linha DENTRO de um seletor é sempre engano: ou o `{}` de
    // cima ficou faltando, ou uma vírgula. Vírgula legítima também quebra
    // linha, então só acusa quando NÃO há vírgula.
    const emendados = seletores
      .filter((s) => /\n/.test(s.sel) && !s.sel.includes(','))
      .map((s) => `linha ${s.linha}: ${JSON.stringify(s.sel)}`);
    expect(emendados, 'seletor sem bloco { } grudou no seguinte').toEqual([]);
  });

  it('o #view é regra própria, e não descendente de um tema', () => {
    // É ele que carrega padding lateral E rolagem das 32 telas. Preso a
    // `#phone.dark`, as duas coisas somem no tema claro sem avisar.
    const view = seletores.filter((s) => /(^|,)\s*#view\s*(,|$)/.test(s.sel));
    expect(view.length, 'a regra do #view sumiu ou mudou de nome').toBeGreaterThan(0);
    for (const v of view) {
      expect(v.sel, `o #view não pode depender de um tema (linha ${v.linha})`)
        .not.toMatch(/\.dark|\.vidro/);
    }
  });

  it('o padding do #view existe e sai do token de margem', () => {
    let achou = null;
    folha.walkRules(/(^|,)\s*#view\s*(,|$)/, (r) => {
      r.walkDecls('padding', (d) => { achou = d.value; });
    });
    expect(achou, 'o #view ficou sem padding — texto encosta na borda').toBeTruthy();
    expect(achou, 'a margem lateral tem que vir do --gap').toContain('var(--gap)');
  });

  it('a rolagem das telas continua no #view', () => {
    const props = new Set();
    folha.walkRules(/(^|,)\s*#view\s*(,|$)/, (r) => r.walkDecls((d) => props.add(`${d.prop}:${d.value}`)));
    // Sem os três juntos o #view não encolhe dentro do #phone (overflow:hidden)
    // e o conteúdo do fim da tela fica inalcançável — inclusive o CTA.
    for (const p of ['flex:1', 'min-height:0', 'overflow-y:auto']) {
      expect(props.has(p), `o #view perdeu ${p} — a rolagem morre com isso`).toBe(true);
    }
  });
});

describe('a margem lateral tem uma fonte só', () => {
  /* #view, #trail e .vzzone PRECISAM concordar: o #trail é irmão do #view (não
     filho), e a faixa de depoimentos sangra uma margem NEGATIVA do valor exato
     do padding pra alcançar a borda. Três números iguais escritos à mão é como
     eles deixam de ser iguais. */
  const usa = (seletor, prop) => {
    let v = null;
    folha.walkRules(seletor, (r) => r.walkDecls(prop, (d) => { v = d.value; }));
    return v;
  };

  it('o #trail deriva do mesmo token do #view', () => {
    expect(usa(/(^|,)\s*#trail\s*(,|$)/, 'padding')).toContain('var(--gap)');
  });

  it('a sangria da faixa de depoimentos também', () => {
    // Se ela cancelar um valor diferente do padding, a faixa fica emoldurada
    // ou vaza pra fora do aparelho.
    expect(usa(/\.vzzone/, 'margin')).toContain('var(--gap)');
  });

  it('o token cresce em tela maior, em vez de a linha de texto esticar', () => {
    expect(css).toMatch(/@media \(min-width:\d+px\)\s*\{\s*#phone\{--gap:\d+px\}/);
  });
});

describe('seletores que não casam com nada', () => {
  it('toda classe citada na folha existe em algum componente', () => {
    // `.card-verde` era um seletor meu que nunca casou: a classe real é
    // `.card-green`. Regra morta não falha em lugar nenhum — só não faz nada.
    // A árvore INTEIRA: .bar-col, por exemplo, vive em app/CadenceApp.js —
    // varrer só as pastas do /comecar acusava classe viva como morta.
    const fonte = ['components', 'app', 'lib']
      .flatMap((d) => {
        const { readdirSync, statSync } = require('node:fs');
        const anda = (p) => statSync(p).isDirectory()
          ? readdirSync(p).flatMap((f) => anda(join(p, f)))
          : [p];
        return anda(join(raiz, d));
      })
      .filter((f) => /\.(js|jsx)$/.test(f))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');

    const suspeitas = new Set();
    for (const { sel } of seletores) {
      for (const m of sel.matchAll(/\.([a-z][a-z0-9-]{3,})\b/g)) {
        const classe = m[1];
        if (['dark', 'vidro'].includes(classe)) continue;
        if (!fonte.includes(classe)) suspeitas.add(classe);
      }
    }
    expect([...suspeitas].sort(), 'classe na folha que nenhum componente usa').toEqual([]);
  });
});
