'use client';

import { useEffect, useRef } from 'react';
import { montarConstelacao, CORES_CLARAS } from '../../lib/constelacao';

/* O fundo das 33 telas: a malha atrás de tudo, presa ao #phone.

   A física mora em lib/constelacao.js, compartilhada com o fundo do /v2 —
   duas cópias divergiriam em silêncio. Aqui ficam só as cores e o alvo dos
   eventos de ponteiro, que é o elemento-pai.

   Esta tela é sempre CLARA (era sempre escura até a virada do tema), então a
   cor é fixa na montagem — diferente do /v2, que troca de tema em execução e
   precisa reler a cada quadro. */
export function Constellation() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    return montarConstelacao(cv, { cores: () => CORES_CLARAS });
  }, []);

  return <canvas id="canvas" ref={ref} aria-hidden="true" />;
}
