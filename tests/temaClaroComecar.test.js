import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/* As 32 telas do /comecar passaram a renderizar CLARAS, e a folha nunca tinha
   sido exercida assim: ela sempre teve base clara com `#phone.dark` por cima.
   O resultado foram caixas pretas com texto preto e texto branco no branco.

   Estes testes prendem as duas classes de erro que causaram isso — não as
   ocorrências, que voltariam com outro nome na semana seguinte. */

const raiz = fileURLToPath(new URL('../', import.meta.url));
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const css = ler('app/comecar/comecar.css');

const telas = readdirSync(join(raiz, 'components/comecar/screens'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => [f, ler(join('components/comecar/screens', f))]);

describe('nada pinta fundo escuro por estilo inline', () => {
  /* Foi ISTO que produziu as caixas pretas: `style={{background:'var(--dark-soft)'}}`
     numa tela vence qualquer regra da folha, então o override do tema claro
     não tinha como alcançar. Cor de fundo é decisão de tema, e tema mora no
     CSS — se voltar pro style, volta o retângulo preto. */
  it.each(telas.map(([f]) => f))('%s não fixa fundo de tema no style', (arquivo) => {
    const [, src] = telas.find(([f]) => f === arquivo);
    const inline = [...src.matchAll(/background:\s*'var\(--dark[\w-]*\)'/g)].map((m) => m[0]);
    expect(inline, `fundo de tema no style vence a folha e não dá pra sobrescrever`).toEqual([]);
  });
});

describe('os tokens do tema escuro têm tradução no claro', () => {
  /* Sete estilos inline usam --dk-soft e --cady-coroa direto. Em vez de
     caçá-los um a um, o escopo .vidro redefine os tokens: quem usar amanhã
     recebe a cor certa sem saber que mudou. */
  const bloco = css.slice(css.lastIndexOf('#phone.vidro{'));

  it.each(['--dk-soft', '--dk-mute', '--dk-line', '--cady-coroa', '--dark-soft', '--card'])(
    '%s é redefinido dentro de #phone.vidro', (token) => {
      expect(bloco).toContain(`${token}:`);
    });

  it('o mint da marca não fica como estava — 1,3:1 no branco é invisível', () => {
    const m = bloco.match(/--cady-coroa:\s*(#[0-9A-Fa-f]{6})/);
    expect(m, 'faltou traduzir --cady-coroa').toBeTruthy();
    expect(m[1].toLowerCase()).not.toBe('#8ff0c0');
  });
});

describe('proporção no telefone', () => {
  it('o botão principal não atravessa a tela inteira', () => {
    // No escuro ele sumia no conjunto; no claro virou o bloco mais escuro da
    // tela e passou a dominá-la.
    expect(css).toMatch(/#phone\.vidro \.cta\{[\s\S]{0,200}max-width:\s*\d+px/);
  });

  it('e volta a ocupar tudo em tela muito estreita', () => {
    // Abaixo de 360px, um teto de 340 deixaria margem lateral maior que a do
    // conteúdo — pior que ocupar a largura toda.
    expect(css).toMatch(/@media \(max-width:359px\)[\s\S]{0,160}max-width:none/);
  });

  it('a seta de voltar tem contorno próprio', () => {
    // A borda era branca sobre fundo branco: sobrava um chevron solto no ar.
    expect(css).toMatch(/#phone\.vidro \.back\{[\s\S]{0,160}border:1px solid #[0-9A-Fa-f]{6}/);
  });
});
