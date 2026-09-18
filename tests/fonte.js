import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/* LER O CÓDIGO SEM LER OS COMENTÁRIOS.

   Boa parte dos testes deste projeto afirma sobre o TEXTO dos arquivos, porque
   não há transform de JSX aqui. Isso tem uma armadilha que já derrubou quatro
   testes corretos: os arquivos EXPLICAM o que costumavam fazer.

   Um comentário dizendo "era `threeMonthsFrom()`, fixo" faz
   `expect(src).not.toContain('threeMonthsFrom')` falhar — com o código certo
   na frente. Quanto melhor o comentário, mais provável a falha.

   Só comentário de BLOCO: cortar `//` por regex também come a string '//' de
   qualquer código que a contenha, e já quebrou a checagem de redirecionador
   aberto do /auth/callback.

   Não é `*.test.js`, então o vitest não o coleta como suíte. */

const RAIZ = fileURLToPath(new URL('../', import.meta.url));

export const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

/** Conteúdo do arquivo, sem comentários de bloco. */
export const lerFonte = (caminho) =>
  semComentarios(readFileSync(join(RAIZ, caminho), 'utf8'));

/** Conteúdo cru, quando o teste afirma sobre o comentário de propósito. */
export const lerCru = (caminho) => readFileSync(join(RAIZ, caminho), 'utf8');

export { RAIZ };
