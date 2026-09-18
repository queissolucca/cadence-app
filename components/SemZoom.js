'use client';

import { useEffect } from 'react';

/* TRAVA O ZOOM DE VERDADE, NÃO SÓ NO PAPEL.

   O `<meta viewport>` com `user-scalable=no, maximum-scale=1` já está em todas
   as rotas (vem do layout raiz, e o Next funde o viewport em vez de
   substituir). Só que o **iOS Safari ignora isso desde o iOS 10**, de
   propósito: a Apple decidiu que uma página não pode tirar o zoom de quem
   precisa dele. No iPhone, o meta sozinho não trava nada.

   Então o bloqueio real é por evento. Cada ouvinte aqui cobre um gesto
   diferente, e nenhum cobre o do outro:

     gesturestart/change/end   pinça no Safari (evento só dele)
     touchmove com 2+ dedos    pinça nos outros navegadores de toque
     wheel com ctrlKey         pinça no trackpad e ctrl+roda no desktop

   O QUE NÃO DÁ PRA FAZER: Ctrl/Cmd com +, - ou 0. Esses são atalhos do
   navegador, não da página — `preventDefault` não os alcança em nenhum
   navegador atual. Escrever um `keydown` pra eles seria código que não faz
   nada e engana quem for ler. Quem quiser dar zoom pelo teclado ou pelo menu
   continua conseguindo, e isso é do navegador, não nosso.

   `passive: false` em todos: sem isso o navegador assume que o ouvinte não vai
   cancelar nada e o preventDefault é ignorado em silêncio. */
export function SemZoom() {
  useEffect(() => {
    const barrar = (e) => { e.preventDefault(); };

    // Safari: a pinça vira gesture*, e não touchmove.
    const gestos = ['gesturestart', 'gesturechange', 'gestureend'];
    gestos.forEach((g) => document.addEventListener(g, barrar, { passive: false }));

    // Demais navegadores de toque: dois dedos ou mais é pinça. Um dedo passa —
    // senão a rolagem morre junto.
    const doisDedos = (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
    document.addEventListener('touchmove', doisDedos, { passive: false });

    // Trackpad e ctrl+roda: o navegador marca ctrlKey mesmo sem a tecla.
    const roda = (e) => { if (e.ctrlKey) e.preventDefault(); };
    document.addEventListener('wheel', roda, { passive: false });

    return () => {
      gestos.forEach((g) => document.removeEventListener(g, barrar));
      document.removeEventListener('touchmove', doisDedos);
      document.removeEventListener('wheel', roda);
    };
  }, []);

  return null;
}
