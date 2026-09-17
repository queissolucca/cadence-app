'use client';

import { useEffect, useRef } from 'react';
import { montarConstelacao } from '../../lib/constelacao';

/* O mesmo fundo vivo das 33 telas de /comecar, agora atrás do app.

   Duas diferenças em relação ao de lá, e as duas por causa do contexto:

   1. O /comecar é sempre escuro; o /v2 tem tema claro e escuro, e o usuário
      troca em tempo de execução (next-themes põe e tira a classe `dark` no
      <html>). Por isso a cor é lida a cada quadro em vez de fixada na montagem:
      trocar de tema não remonta nada, a malha só muda de cor. No claro o mint
      do toque sumiria sobre o creme, então ali o destaque é o verde escuro.

   2. Os eventos de ponteiro escutam a window, e não o elemento-pai. O canvas é
      pointer-events:none (senão engoliria os cliques) e está preso à viewport;
      escutar o pai deixaria a malha morta em toda área que o pai não cobre. */

/* As duas paletas moram em lib/constelacao.js agora. Estavam duplicadas aqui,
   com valores JÁ divergentes dos de lá — a do claro tinha alpha 0.7 e linha no
   verde cheio, enquanto o estudo aprovou linha em verde escuro e alpha 1.155.
   Duas fontes pra mesma decisão é como elas divergem sem ninguém ver. */
import { CORES_ESCURAS as ESCURO, CORES_CLARAS as CLARO } from '../../lib/constelacao';

export function ConstellationBg() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    return montarConstelacao(cv, {
      cores: () => (document.documentElement.classList.contains('dark') ? ESCURO : CLARO),
      alvoPonteiro: window,
    });
  }, []);

  return <canvas className="v2-constelacao" ref={ref} aria-hidden="true" />;
}
