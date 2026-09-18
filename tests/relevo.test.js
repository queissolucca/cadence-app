import { describe, it, expect } from 'vitest';
import { lerFonte } from './fonte.js';

/* O CARTÃO DA INÍCIO PRECISA PARECER UM BOTÃO.

   Duas coisas já quebraram esse efeito antes neste projeto, e as duas são
   invisíveis na revisão:

   1. ESPECIFICIDADE. `.v2-bg a:active .v2-card-dark` (0,3,1) é uma regra
      global que existe desde sempre. Se o estado apertado do relevo for
      escrito com menos que isso, ele nunca aparece — o cartão continua
      afundando só com o `scale` antigo e as sombras ficam paradas. Já
      aconteceu três vezes nesta base (`.glevel i.on` enterrado por
      `#phone.vidro .glevel i`), sempre com o CSS "certo" no arquivo.

   2. ESTILO INLINE. `box-shadow` inline vence qualquer classe. Um
      `boxShadow` esquecido no `style={{...}}` do cartão apaga o relevo
      inteiro sem erro nenhum. */

const PAGINA = lerFonte('app/v2/(app)/page.js');
const CSS = lerFonte('app/globals.css');

/** Especificidade (ids, classes+pseudo-classes, tipos) de um seletor simples. */
function especificidade(sel) {
  return [
    (sel.match(/#[\w-]+/g) || []).length,
    (sel.match(/\.[\w-]+|:(?!:)[a-z-]+/g) || []).length,
    (sel.match(/(^|[\s>+~])[a-z]+(?![\w-]*[({])/g) || []).length,
  ];
}
const venceu = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false; // empate não conta: aí quem decide é a ordem, e isso é frágil
};

describe('o relevo do cartão "Conversa aberta"', () => {
  it('o cartão usa a classe do relevo, e não uma sombra inline', () => {
    expect(PAGINA).toContain('className="v2-card-dark v2-relevo"');
    // A única sombra que pode sobrar na página é nenhuma: as duas que havia
    // (cartão e botão verde) viraram classe pra poder ter estado apertado.
    expect(PAGINA, 'box-shadow inline enterra o .v2-relevo sem avisar').not.toContain('boxShadow');
  });

  it('o botão verde de dentro também é da classe', () => {
    expect(PAGINA).toContain('className="v2-relevo-btn"');
  });

  it('as duas classes existem no CSS, em repouso e apertadas', () => {
    for (const sel of [
      '.v2-bg .v2-card-dark.v2-relevo {',
      '.v2-bg a:active .v2-card-dark.v2-relevo {',
      '.v2-relevo .v2-relevo-btn {',
      '.v2-bg a:active .v2-relevo .v2-relevo-btn {',
    ]) expect(CSS, `faltou a regra ${sel}`).toContain(sel);
  });

  it('o estado apertado vence a regra global de :active', () => {
    // Esta é a armadilha: a regra global já mexe em `transform` do mesmo
    // elemento. Sem ganhar dela, o afundar de 1px nunca acontece.
    const global = especificidade('.v2-bg a:active .v2-card-dark');
    const nossa = especificidade('.v2-bg a:active .v2-card-dark.v2-relevo');
    expect(venceu(nossa, global), `${nossa} precisa vencer ${global}`).toBe(true);
  });

  it('o apertado encolhe a sombra em vez de só mover o cartão', () => {
    // O que faz parecer botão é a DISTÂNCIA até a página diminuir. Só o
    // translate, com a sombra do mesmo tamanho, lê como cartão escorregando.
    const bloco = CSS.split('.v2-bg a:active .v2-card-dark.v2-relevo {')[1].split('}')[0];
    expect(bloco).toContain('translateY');
    expect(bloco).toContain('box-shadow');
  });

  it('a transição do relevo para com movimento reduzido', () => {
    const rm = CSS.split('@media (prefers-reduced-motion: reduce) {')[1];
    expect(rm).toContain('.v2-bg .v2-card-dark.v2-relevo');
    expect(rm).toContain('.v2-relevo .v2-relevo-btn');
  });
});
