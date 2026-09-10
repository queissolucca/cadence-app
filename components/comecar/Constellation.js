'use client';

import { useEffect, useRef } from 'react';
import { montarConstelacao } from '../../lib/constelacao';

/* O fundo das 33 telas: a malha atrás de tudo, presa ao #phone.

   A física mora em lib/constelacao.js, compartilhada com o fundo do /v2 —
   duas cópias divergiriam em silêncio. Aqui ficam só as cores (esta tela é
   sempre escura) e o alvo dos eventos de ponteiro, que é o elemento-pai. */
export function Constellation() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    return montarConstelacao(cv);
  }, []);

  return <canvas id="canvas" ref={ref} aria-hidden="true" />;
}
