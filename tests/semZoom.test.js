import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/* O ZOOM TEM QUE ESTAR TRAVADO EM TODA TELA — e "travado" aqui não é o
   `<meta viewport>`.

   O meta com `user-scalable=no` está certo e vale na maioria dos navegadores,
   mas o **iOS Safari o ignora desde o iOS 10**, por decisão da Apple. Num
   iPhone, confiar só no meta é não travar nada — e é exatamente onde a maior
   parte das pessoas abre o app.

   Então o teste cobre as duas pontas: o meta (que o layout raiz declara e todo
   o resto herda) e os ouvintes de evento, que são o que de fato segura a
   pinça. */

const raiz = fileURLToPath(new URL('../', import.meta.url));

/* SEM COMENTÁRIO DE BLOCO.

   Estes arquivos EXPLICAM o que não fazem — o SemZoom diz, com todas as
   letras, por que não existe um `keydown` ali. Uma asserção sobre o texto cru
   casaria com a explicação e falharia justamente quando o código está certo.
   (Só bloco: cortar `//` por regex também come a string '//' de qualquer
   código que a contenha.) */
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('o viewport nega zoom, e ninguém o desfaz', () => {
  const layoutRaiz = ler('app/layout.js');

  it('o layout raiz declara a negativa', () => {
    expect(layoutRaiz).toMatch(/userScalable:\s*false/);
    expect(layoutRaiz).toMatch(/maximumScale:\s*1/);
  });

  it('nenhum layout filho reabre o zoom', () => {
    /* O Next FUNDE o viewport entre camadas em vez de substituir, então um
       filho que declare `userScalable: true` (ou maximumScale maior) ganha só
       naquela rota — e o furo aparece numa tela só, que é o tipo de coisa que
       ninguém testa. */
    const anda = (p) => (statSync(p).isDirectory()
      ? readdirSync(p).flatMap((f) => anda(join(p, f)))
      : [p]);
    const layouts = anda(join(raiz, 'app'))
      .filter((f) => f.endsWith('layout.js') && !f.endsWith(join('app', 'layout.js')));

    for (const f of layouts) {
      const src = readFileSync(f, 'utf8');
      const nome = f.slice(raiz.length);
      expect(src, `${nome} reabriu o zoom`).not.toMatch(/userScalable:\s*true/);
      expect(src, `${nome} permitiu ampliar`).not.toMatch(/maximumScale:\s*[2-9]/);
    }
  });
});

describe('a pinça é barrada por evento, que é o que vale no iPhone', () => {
  const sz = ler('components/SemZoom.js');

  it('cobre os três gestos, e eles não se substituem', () => {
    // Safari manda gesture*; os outros mandam touchmove; o trackpad manda
    // wheel com ctrlKey. Faltar um deixa uma plataforma inteira de fora.
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) expect(sz).toContain(ev);
    expect(sz).toContain('touchmove');
    expect(sz).toMatch(/wheel/);
    expect(sz).toMatch(/e\.ctrlKey/);
  });

  it('só barra com DOIS dedos — com um, a rolagem morreria', () => {
    expect(sz).toMatch(/touches\.length > 1/);
  });

  it('os ouvintes são passive:false, ou o preventDefault é ignorado', () => {
    /* Sem isso o navegador assume que o ouvinte não vai cancelar nada e
       descarta o preventDefault em silêncio — o código parece certo e não
       faz nada. */
    const registros = [...sz.matchAll(/addEventListener\([^)]*\)/g)].map((m) => m[0]);
    expect(registros.length).toBeGreaterThan(2);
    for (const r of registros) {
      expect(r, `${r} sem passive:false`).toMatch(/passive:\s*false/);
    }
  });

  it('não finge travar o zoom por teclado', () => {
    /* Ctrl/Cmd com +, - ou 0 são atalhos do NAVEGADOR: preventDefault não os
       alcança em navegador nenhum atual. Um keydown pra eles seria código que
       não faz nada e engana quem for ler. */
    expect(sz).not.toMatch(/keydown/);
  });

  it('está montado no layout raiz, e não numa rota só', () => {
    expect(ler('app/layout.js')).toMatch(/<SemZoom \/>/);
  });
});

describe('o toque duplo também não amplia', () => {
  it.each([['app/globals.css'], ['app/comecar/comecar.css']])(
    '%s declara touch-action', (folha) => {
      // O <meta viewport> não cobre o duplo-toque; `manipulation` cobre, sem
      // tirar rolagem nem toque comum.
      expect(ler(folha)).toMatch(/touch-action:\s*manipulation/);
    });
});
