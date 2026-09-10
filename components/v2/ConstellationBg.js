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

const ESCURO = { linha: '62,155,95', ponto: '62,155,95', toque: '143,240,192', alpha: 1 };
// No creme do tema claro o verde cheio fica pesado, e o mint desaparece.
const CLARO = { linha: '62,155,95', ponto: '62,155,95', toque: '44,115,71', alpha: 0.7 };

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
