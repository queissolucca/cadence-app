'use client';

import { useEffect, useRef } from 'react';
import { cadyLiveSVG, CADY_CSS, STATE_LAYERS } from '../../lib/cady/cady-live';

/* A Cady dentro da conversa, animada pela voz de verdade.

   Não usa o `mountCady` do lib/cady: aquele monta a Cady autônoma das 33 telas,
   que reage ao toque, olha pro cursor e murmura sozinha quando fica parada. Aqui
   quem manda no rosto é a conversa — deixar as duas coisas disputando o mesmo
   `data-state` daria a Cady murmurando no meio de uma correção.

   O SVG é montado UMA vez e depois só recebe atributos. Remontar a cada troca
   de estado cortaria as animações da coroa e do corpo no meio, e piscaria a
   imagem inteira a cada frase.

   `nivel` (0..1) é a amplitude real do áudio dela, lida do
   `getOutputVolume()` do SDK do ElevenLabs. É isso que faz a boca acompanhar a
   fala em vez de abrir e fechar num loop cronometrado que nunca bate com o som. */

let cssInjetado = false;

function injetarCSS() {
  if (cssInjetado || typeof document === 'undefined') return;
  if (!document.getElementById('cady-css')) {
    const tag = document.createElement('style');
    tag.id = 'cady-css';
    tag.textContent = CADY_CSS;
    document.head.appendChild(tag);
  }
  cssInjetado = true;
}

export function CadyLive({ estado = 'idle', nivel = 0, size = 190, label = 'Cady' }) {
  const host = useRef(null);
  const svg = useRef(null);
  const camadas = useRef(null);

  useEffect(() => {
    injetarCSS();
    const el = host.current;
    if (!el) return undefined;
    el.innerHTML = cadyLiveSVG({ uid: 'conv', background: false, label });
    svg.current = el.querySelector('.cady');
    camadas.current = svg.current.querySelectorAll('.cady-ly');
    // data-live desliga o murmúrio por CSS e liga a boca por --mouth
    svg.current.dataset.live = '1';
    return () => { el.innerHTML = ''; };
  }, [label]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    el.dataset.state = estado;
    const ligadas = STATE_LAYERS[estado] || STATE_LAYERS.idle;
    camadas.current.forEach((g) => {
      g.style.display = ligadas.includes(g.dataset.ly) ? 'block' : 'none';
    });
  }, [estado]);

  useEffect(() => {
    const el = svg.current;
    if (el) el.style.setProperty('--mouth', String(Math.max(0, Math.min(1, nivel))));
  }, [nivel]);

  return <div ref={host} style={{ width: size, height: size, lineHeight: 0 }} aria-hidden="true" />;
}
