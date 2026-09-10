'use client';

import { useEffect, useRef } from 'react';
import { cadySVG } from '../../lib/comecar/cady/cady';
import { mountCady, CADY_CSS } from '../../lib/comecar/cady/cady-live';

/* A folha de estilo da Cady é entregue pelo próprio módulo (é ele que conhece a
   geometria). Injetada uma vez, no cliente — não dá pra colocar em globals.css
   sem duplicar números que só o cady.js deveria saber. */
let cssPosto = false;
function porCSS() {
  if (cssPosto || typeof document === 'undefined') return;
  cssPosto = true;
  const s = document.createElement('style');
  s.textContent = CADY_CSS;
  document.head.appendChild(s);
}

let uid = 0;

/* Cady parada: uma expressão fixa. Continua viva — a boca murmura por CSS
   (.cady-mouth), que é o que evita ela parecer um adesivo. */
export function Cady({ expression = 'repouso', size = 150, className = '', style }) {
  const ref = useRef(null);
  useEffect(() => {
    porCSS();
    if (ref.current) {
      ref.current.innerHTML = cadySVG({
        expression, background: false, size, uid: 'st' + (uid++),
      });
    }
  }, [expression, size]);

  return (
    <div
      className={`cady-host static ${className}`}
      style={{ '--sz': `${size}px`, ...style }}
      ref={ref}
      aria-label="Cady"
      role="img"
    />
  );
}

/* Cady viva: segue o dedo/cursor, reage ao toque e murmura sozinha.
   `onState` deixa a tela saber o que ela está fazendo (usado no diagnóstico). */
export function CadyViva({ size = 150, className = '', style, onState, interactive = true }) {
  const host = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    porCSS();
    if (!host.current) return undefined;
    inst.current = mountCady(host.current, {
      palette: 'rosa-quartzo', background: false, uid: 'lv' + (uid++),
      interactive, onState,
    });
    return () => { inst.current?.destroy(); inst.current = null; };
    // onState fica fora das deps de propósito: recriar a Cady a cada render do
    // pai mataria o murmúrio e o estado de toque no meio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  return (
    <div
      className={`cady-host ${className}`}
      style={{ '--sz': `${size}px`, ...style }}
      ref={host}
    />
  );
}

/* Deixa uma tela mandar a Cady mudar de estado sem remontá-la. */
export function useCadyRef() {
  return useRef(null);
}
