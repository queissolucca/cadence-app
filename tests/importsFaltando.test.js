import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* O ERRO QUE O `next build` NÃO PEGA, E QUE JÁ DERRUBOU PRODUÇÃO DUAS VEZES.

   O bundler resolve MÓDULOS, não nomes livres. Um identificador que não existe
   compila sem reclamar e estoura na primeira render, em produção, como
   "Application error: a server-side exception has occurred".

   Aconteceu duas vezes num dia:
     • `useRef` faltando no import de screens/app.js — a tela de criar conta
       inteira quebrava, e só apareceu quando rodei um navegador de verdade.
     • `dayKeySP` tirado do import de app/v2/(app)/page.js quando a camada de
       dados mudou de lugar, enquanto o calendário da semana continuava
       chamando a função — o /v2 caiu pra todo mundo.

   POR QUE NÃO É UM LINTER GENÉRICO. Um "procure todo nome não declarado" com
   regex tem falso positivo demais pra ser levado a sério: CSS dentro de template
   string, texto de JSX, método de objeto em forma curta. Um teste que grita
   sempre é um teste que se aprende a ignorar.

   Então o alvo é estreito e é exatamente o dos dois acidentes: nomes que o
   PROJETO exporta (ou hooks do React) sendo CHAMADOS num arquivo que não os
   importa. Fora disso, cala a boca. */

const RAIZES = ['app', 'lib', 'components'];

// Precisam ser importados, sempre — e são o outro caso que já quebrou.
const HOOKS_REACT = [
  'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useReducer',
  'useContext', 'useLayoutEffect', 'useTransition', 'useId', 'useSyncExternalStore',
];

function arquivos(dir, out = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, out);
    else if (nome.endsWith('.js')) out.push(caminho);
  }
  return out;
}

/* Tira comentários e o conteúdo de strings/templates: é lá que mora quase todo
   falso positivo (um `@media (...)` num style, um `min(...)` num calc). */
function limpar(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

const TODOS = RAIZES.flatMap((r) => arquivos(r));

// Tudo que o projeto exporta, por nome.
const EXPORTADOS = new Set(HOOKS_REACT);
for (const f of TODOS) {
  const src = limpar(readFileSync(f, 'utf8'));
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) EXPORTADOS.add(m[1]);
  for (const m of src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)/g)) EXPORTADOS.add(m[1]);
}

describe('nenhum nome do projeto é usado sem import', () => {
  it('todo helper chamado num arquivo está importado ou declarado nele', () => {
    const problemas = [];

    for (const f of TODOS) {
      const src = limpar(readFileSync(f, 'utf8'));

      // O que este arquivo tem à mão: imports, declarações locais, parâmetros.
      const naMao = new Set();
      for (const m of src.matchAll(/import\s+([^;]+?)\s+from\s*['"][^'"]*['"]/g)) {
        for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) naMao.add(n[0]);
      }
      for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) naMao.add(m[1]);
      for (const m of src.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) naMao.add(m[1]);
      // desestruturação: `const { a, b } = ...`
      for (const m of src.matchAll(/\b(?:const|let|var)\s*[{[]([^}\]]*)[}\]]/g)) {
        for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) naMao.add(n[0]);
      }
      // parâmetros de função e de arrow
      for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) {
        for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) naMao.add(n[0]);
      }
      for (const m of src.matchAll(/function[^(]*\(([^()]*)\)/g)) {
        for (const n of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) naMao.add(n[0]);
      }
      for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) naMao.add(m[1]);
      // chave de objeto (`nome:`) e método em forma curta (`nome() {`) não são
      // referências livres — é daqui que vinham getAll/setAll/destroy.
      for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) naMao.add(m[1]);
      for (const m of src.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/gm)) naMao.add(m[1]);

      // Chamadas: `nome(` que não venha depois de um ponto.
      for (const m of src.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const nome = m[2];
        if (!EXPORTADOS.has(nome)) continue;   // só nomes do projeto / hooks
        if (naMao.has(nome)) continue;
        problemas.push(`${f}: usa "${nome}" sem importar nem declarar`);
      }
    }

    expect([...new Set(problemas)]).toEqual([]);
  });

  it('a varredura está realmente olhando o código (e não uma lista vazia)', () => {
    // Sem isto, um erro no caminho dos arquivos faria o teste acima passar
    // sempre, sem olhar nada — o pior tipo de teste verde.
    expect(TODOS.length).toBeGreaterThan(50);
    expect(EXPORTADOS.size).toBeGreaterThan(50);
    expect(EXPORTADOS.has('dayKeySP'), 'o helper do acidente precisa estar no radar').toBe(true);
    expect(EXPORTADOS.has('useRef')).toBe(true);
  });
});
