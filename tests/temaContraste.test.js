import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* O bug: o botão "+ adicionar" da Revisão usava `background: var(--ink)` com
   texto branco. `--ink` INVERTE com o tema (#141412 no claro, #f2f2ea no
   escuro), então no modo escuro o fundo virava quase branco — botão branco com
   letra branca. E a cor do texto era `var(--paper, #fff)`, sendo que `--paper`
   não existe no projeto: parecia theme-aware e nunca foi.

   Estes testes não protegem só aquele botão; protegem a classe do erro:
   token que inverte usado como fundo, e variável que não existe. */

// --- contraste WCAG ------------------------------------------------------
const canal = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luz = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};
const razao = (a, b) => {
  const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const VERDE = '#3E9B5F';        // --green, igual nos dois temas
const VERDE_ESCURO = '#2c7347'; // --green-dark
const TINTA_NO_VERDE = '#08160e';

describe('contraste do botão de ação verde', () => {
  it('a razão calculada bate com a decisão tomada', () => {
    // Branco sobre o verde da marca NÃO passa pra texto deste tamanho — foi por
    // isso que o texto do botão ficou quase preto em vez de branco.
    expect(razao(VERDE, '#ffffff')).toBeLessThan(4.5);
    expect(razao(VERDE, TINTA_NO_VERDE)).toBeGreaterThanOrEqual(4.5);
  });

  it('o par escolhido passa em AA', () => {
    expect(razao(VERDE, TINTA_NO_VERDE)).toBeGreaterThanOrEqual(4.5);
  });

  it('se um dia trocar pro verde escuro, branco aí passa', () => {
    // Registra a alternativa: --green-dark com texto branco também serve.
    expect(razao(VERDE_ESCURO, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

// --- varredura do código -------------------------------------------------
function arquivos(dir, ext = ['.js', '.css'], out = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, ext, out);
    else if (ext.some((e) => nome.endsWith(e))) out.push(caminho);
  }
  return out;
}

const FONTES = [...arquivos('components'), ...arquivos('app'), ...arquivos('lib')];

// Tokens que trocam de valor entre claro e escuro. Usar qualquer um deles como
// FUNDO junto de uma cor de texto fixa e clara garante o bug em um dos temas.
const INVERTEM = ['--ink', '--bg', '--ink-soft'];

describe('tokens que invertem não podem ser fundo com texto claro fixo', () => {
  it('nenhum arquivo faz isso', () => {
    const culpados = [];
    for (const arq of FONTES) {
      const txt = readFileSync(arq, 'utf8');
      for (const [n, linha] of txt.split('\n').entries()) {
        const temFundoInvertido = INVERTEM.some((t) =>
          new RegExp(`background(-color)?:\\s*'?"?var\\(${t}\\)`).test(linha));
        // Texto claro cravado na mesma linha: '#fff', '#ffffff', 'white'
        const temTextoClaroFixo = /color:\s*'?"?(#fff(fff)?\b|white\b)/i.test(linha);
        if (temFundoInvertido && temTextoClaroFixo) culpados.push(`${arq}:${n + 1}`);
      }
    }
    expect(culpados, `use --v2-brand (constante) ou --green:\n${culpados.join('\n')}`).toEqual([]);
  });
});

describe('variáveis CSS referenciadas existem', () => {
  it('--paper não é usada em lugar nenhum', () => {
    // Nunca foi definida. `var(--paper, #fff)` sempre caiu no branco, dando a
    // falsa impressão de que a cor acompanhava o tema.
    // `var(--paper` (uso), e não o nome solto: comentário que EXPLICA o bug
    // cita o nome, e reprovar por isso puniria a documentação.
    const usos = FONTES.filter((a) => readFileSync(a, 'utf8').includes('var(--paper'));
    expect(usos, `--paper não existe no projeto: ${usos.join(', ')}`).toEqual([]);
  });
});
