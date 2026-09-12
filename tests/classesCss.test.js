import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* DOIS DONOS PARA UM NOME DE CLASSE.

   O botão de gravar do teste de fala aparecia encostado na esquerda da tela,
   meio pra fora, em vez de centralizado. A causa não estava em nenhuma regra do
   botão: existia um OUTRO `.rec` no mesmo arquivo — o selo "recomendado" das
   opções, com `margin-left:5px`, `padding` e `font-size:9px` — e o botão virava
   `class="mic rec"` ao gravar. Mesma especificidade, e o selo aparece depois no
   arquivo: o `margin-left:5px` dele vencia o `margin:0 auto` do botão.

   É um defeito que a ordem do arquivo decide. Ninguém escreveu nada errado nas
   duas regras; elas só não deveriam dividir o nome. E é invisível na revisão,
   porque cada metade parece certa sozinha.

   Este teste cobre o caso concreto que aconteceu, e a regra geral que ele
   sugere: classe de ESTADO (o que um componente vira) não pode ter o mesmo nome
   de classe de COMPONENTE (o que uma coisa é). */

const CSS = readFileSync('app/comecar/comecar.css', 'utf8');

function arquivosJs(dir, out = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosJs(caminho, out);
    else if (nome.endsWith('.js')) out.push(caminho);
  }
  return out;
}
const FONTES = [...arquivosJs('components/comecar'), ...arquivosJs('app/comecar')]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

describe('o botão de gravar não herda o selo "recomendado"', () => {
  it('a classe de gravação não se chama mais `rec`', () => {
    expect(FONTES).not.toMatch(/mic \$\{[^}]*'rec'/);
    expect(FONTES).toMatch(/mic \$\{[^}]*'gravando'/);
    expect(CSS).toContain('.mic.gravando{');
  });

  it('o `.rec` que sobrou é só o selo, e continua com a margem dele', () => {
    // A margem do selo é legítima — o problema era ela alcançar o botão.
    expect(CSS).toMatch(/^\.rec\{[^}]*margin-left:5px/ms);
    // E o botão continua com o `auto` que o centraliza.
    expect(CSS).toMatch(/\.mic\{[^}]*margin:0 auto/);
  });

  it('nenhuma classe de estado do microfone colide com outra regra', () => {
    // Todo nome de classe que aparece em algum seletor — inclusive o segundo
    // de um `.mic.gravando`, que é justamente a forma acoplada que se quer.
    const declaradas = new Set();
    for (const m of CSS.matchAll(/\.([a-z][\w-]*)/g)) declaradas.add(m[1]);
    // As classes que o componente do microfone liga e desliga.
    for (const estado of ['gravando']) {
      const solta = new RegExp(`(^|[\\s,}])\\.${estado}\\s*\\{`, 'm');
      expect(CSS, `.${estado} não pode existir solta: vira herança pra qualquer elemento que ganhe a classe`)
        .not.toMatch(solta);
      expect(declaradas.has(estado), `.${estado} precisa existir, mas sempre acoplada (.mic.${estado})`).toBe(true);
    }
  });
});

describe('a instrução abaixo do microfone', () => {
  it('é maior que um rótulo de seção — é instrução, não etiqueta', () => {
    const kicker = CSS.match(/\.kicker\{[^}]*font-size:([\d.]+)px/);
    const hint = CSS.match(/\.mic-hint\{[^}]*font-size:([\d.]+)px/);
    expect(kicker, 'o .kicker precisa existir pra comparação valer').toBeTruthy();
    expect(hint).toBeTruthy();
    expect(Number(hint[1])).toBeGreaterThan(Number(kicker[1]));
  });

  it('diz o que fazer, e não só o que está acontecendo', () => {
    // "estou te ouvindo" descreve; "toque pra parar" instrui. A tela precisa da
    // segunda, porque o botão vermelho e as ondas já descrevem sozinhos.
    expect(FONTES).toContain('toque pra parar quando terminar');
  });
});

describe('seleção de texto no fluxo', () => {
  it('a casca do fluxo não deixa selecionar texto', () => {
    expect(CSS).toMatch(/#phone\{[^}]*user-select:none/);
    // A metade que vale no iPhone: sem ela o toque longo continua abrindo a
    // lupa e o menu de copiar, mesmo com a seleção desligada.
    expect(CSS).toMatch(/#phone\{[^}]*-webkit-touch-callout:none/);
  });

  /* Esta é a que protege o cadastro. Sem a exceção, ninguém consegue
     posicionar o cursor pra corrigir um e-mail digitado errado nem selecionar
     a senha pra apagar — e não há sintoma nenhum: o campo aceita digitação, só
     não deixa mexer no que já está lá. */
  it('mas os campos continuam selecionáveis — senão ninguém corrige o que digitou', () => {
    const regra = CSS.match(/#phone input[^{]*\{[^}]*\}/);
    expect(regra, 'precisa existir uma regra de exceção pros campos').toBeTruthy();
    expect(regra[0]).toMatch(/user-select:text/);
    expect(regra[0]).toContain('textarea');
    expect(regra[0]).toContain('contenteditable');
  });
});
