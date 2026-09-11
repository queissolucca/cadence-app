'use client';

import { useEffect, useRef } from 'react';
import { cadyLiveSVG, CADY_CSS, STATE_LAYERS } from '../../lib/cady/cady-live';

/* A Cady da conversa.

   Não usa o `mountCady` do lib/cady: aquele monta a Cady autônoma das 33 telas,
   que reage ao toque, olha pro cursor e murmura sozinha quando fica parada. Aqui
   quem manda no rosto é a conversa — deixar as duas coisas disputando o mesmo
   `data-state` daria a Cady murmurando no meio de uma correção.

   O SVG é montado UMA vez e depois só recebe atributos. Remontar a cada troca
   de estado cortaria as animações da coroa e do corpo no meio, e piscaria a
   imagem inteira a cada frase.

   POR QUE UM LOOP E NÃO SÓ TROCA DE ESTADO
   A primeira versão só ligava as camadas do estado e escalava a boca. O rosto
   ficava parado: os olhos nunca mudavam, ela nunca piscava, a cabeça não saía
   do lugar e a boca era sempre a mesma elipse esticando. Quem está falando não
   fica imóvel. Então o loop aqui é dono de três coisas que o estado sozinho não
   dá:

     1. a cabeça se move — sobe, desce, vai pros lados e inclina, mais forte
        quando ela fala e reagindo aos picos da voz;
     2. ela pisca, em intervalos irregulares (piscada em cadência fixa lê como
        relógio, não como bicho vivo), e de vez em quando segura um olhar
        sorrindo enquanto fala;
     3. a boca troca de FORMATO conforme a amplitude — fechada, "o", falando,
        aberta — em vez de uma forma só esticando.

   `nivel` (0..1) é a amplitude real do áudio dela, lida do `getOutputVolume()`
   do SDK do ElevenLabs. É isso que faz a boca acompanhar a fala em vez de abrir
   e fechar num loop cronometrado que nunca bate com o som. */

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

/* Quais estados são "ela está emitindo som". Continua existindo como PALPITE:
   quem renderiza a Cady da conversa passa `falando` de verdade (é o
   `isSpeaking` do SDK), e aí este conjunto não é consultado. Ele resolve os
   casos em que não há sinal nenhum — a prévia do styleguide, por exemplo. */
const FALANDO = new Set(['talking', 'corrigindo_falando', 'rindo', 'elogiando']);
const BRAVA = new Set(['corrigindo', 'corrigindo_falando']);
// Estados de riso: a boca nunca fecha de todo, mesmo nas pausas da frase.
const RINDO = new Set(['rindo', 'elogiando']);
// Olhos que fazem sentido piscar. Em 'mudo' o olho já é um traço, e piscar um
// traço não lê como nada.
const PISCAVEL = new Set(['eye-dot', 'eye-track', 'eye-track-big', 'eye-sparkle']);

/* Formato da boca pela amplitude. Um degrau só (esticar uma elipse) lê como
   boneco; trocar a forma é o que dá leitura de fala. */
function bocaPor(nivel, brava, rindo) {
  if (brava) return nivel < 0.30 ? 'm-grit' : 'm-open';
  /* Rindo, a rampa não desce até a boca fechada. Com a rampa normal, cada pausa
     entre frases fechava a boca em `m-small` e o riso apagava e reacendia várias
     vezes por segundo — lia como boca mastigando, não como alguém rindo. Aqui o
     piso é o "o" e o topo é a boca aberta com língua, então o que a amplitude
     controla é QUANTO ela ri, não SE ela ri. */
  if (rindo) {
    if (nivel < 0.18) return 'm-o';
    if (nivel < 0.42) return 'm-talk';
    return 'm-open';
  }
  if (nivel < 0.12) return 'm-small';
  if (nivel < 0.30) return 'm-o';
  if (nivel < 0.58) return 'm-talk';
  return 'm-open';
}

const sorteio = (a, b) => a + Math.random() * (b - a);

/* `nivel` null = não existe áudio nenhum pra seguir (é o caso do chat escrito).
   Aí a boca oscila sozinha enquanto ela "responde" — e isso não é fingir
   sincronia com som, porque som não há: é só o sinal de que ela está falando
   com você. Com áudio, `nivel` é a amplitude de verdade e a boca segue ela. */
export function CadyLive({ estado = 'idle', nivel = 0, size = 190, label = 'Cady', falando = null }) {
  const host = useRef(null);
  const svg = useRef(null);
  const camadas = useRef([]);
  // Lidos dentro do loop sem reiniciá-lo a cada quadro.
  const vivo = useRef({ estado, nivel, falando });
  vivo.current.estado = estado;
  vivo.current.nivel = nivel;
  vivo.current.falando = falando;

  useEffect(() => {
    injetarCSS();
    const el = host.current;
    if (!el) return undefined;
    el.innerHTML = cadyLiveSVG({ uid: 'conv', background: false, label });
    const s = el.querySelector('.cady');
    svg.current = s;
    camadas.current = Array.from(s.querySelectorAll('.cady-ly'));
    s.dataset.live = '1'; // desliga o murmúrio por CSS e liga a boca por --mouth

    const parado = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let raf = 0;
    let ultimo = '';          // assinatura das camadas visíveis, pra não mexer no DOM à toa
    let piscaEm = performance.now() + sorteio(1200, 3200);
    let piscaAte = 0;
    let beatEm = performance.now() + sorteio(6000, 12000);
    let beatAte = 0;

    const quadro = (t) => {
      const { estado: e } = vivo.current;
      const bruto = vivo.current.nivel;
      /* Quem sabe se ela está falando é o SDK, não o nome do estado. Antes isso
         era deduzido do estado, e uma cara de reação no meio da fala (elogiando,
         por exemplo) congelava a boca — a fala continuava, o rosto parava. */
      const falandoAgora = vivo.current.falando != null ? !!vivo.current.falando : FALANDO.has(e);
      // Sem áudio, o envelope é o produto de duas ondas: uma rápida, que faz as
      // sílabas, e uma lenta, que faz as pausas da frase. Uma senóide só nunca
      // desce o bastante e a boca fica permanentemente aberta — parecia um
      // peixe, não alguém falando.
      const n = bruto == null
        ? (falandoAgora && !parado
          ? Math.max(0, Math.abs(Math.sin(t / 118)) * (0.5 + 0.5 * Math.sin(t / 900)) * 1.08 - 0.03)
          : 0)
        : bruto;
      const base = STATE_LAYERS[e] || STATE_LAYERS.idle;
      const falando = falandoAgora;
      const brava = BRAVA.has(e);

      // --- camadas -------------------------------------------------------
      const olhoBase = base.find((x) => x.startsWith('eye-')) || 'eye-dot';
      const bocaBase = base.find((x) => x.startsWith('m-')) || 'm-smile';
      const resto = base.filter((x) => !x.startsWith('eye-') && !x.startsWith('m-'));

      if (!parado && PISCAVEL.has(olhoBase)) {
        if (t > piscaEm && !piscaAte) {
          piscaAte = t + 150;
          // Intervalo irregular de propósito: piscada em cadência fixa lê como
          // relógio. Falando ela pisca mais, como qualquer pessoa.
          piscaEm = t + (falando ? sorteio(1500, 3600) : sorteio(2400, 5500));
        }
        if (piscaAte && t > piscaAte) piscaAte = 0;
        // Um beat de olhar sorrindo no meio da fala, pra não ficar só piscando.
        if (falando && !brava && t > beatEm && !beatAte) {
          beatAte = t + 620;
          beatEm = t + sorteio(7000, 14000);
        }
        if (beatAte && t > beatAte) beatAte = 0;
      }

      const olho = (piscaAte || beatAte) ? 'eye-arc' : olhoBase;
      const boca = falando && !parado ? bocaPor(n, brava, RINDO.has(e)) : bocaBase;
      const ligadas = [olho, boca, ...resto];
      const chave = ligadas.join('|');
      if (chave !== ultimo) {
        ultimo = chave;
        for (const g of camadas.current) {
          g.style.display = ligadas.includes(g.dataset.ly) ? 'block' : 'none';
        }
      }

      s.style.setProperty('--mouth', String(Math.max(0, Math.min(1, n))));

      // --- a cabeça se mexe ----------------------------------------------
      // Três senos de período diferente: em fase, o movimento fica mecânico.
      // O `n` entra como empurrão nos picos da voz, então a agitação acompanha
      // o que está sendo dito em vez de correr solta.
      if (!parado) {
        const f = falando ? 1 : 0.34;
        const x = (Math.sin(t / 1450) * 2.6 + Math.sin(t / 610) * 1.5) * f;
        const y = (Math.sin(t / 980) * 2.2 + Math.sin(t / 430) * 1.1) * f - (falando ? n * 3.2 : 0);
        const rot = Math.sin(t / 1700) * (falando ? 2.4 : 0.9);
        const esc = 1 + (falando ? n * 0.035 : 0);
        s.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) `
          + `rotate(${rot.toFixed(2)}deg) scale(${esc.toFixed(3)})`;
      }

      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    return () => {
      cancelAnimationFrame(raf);
      el.innerHTML = '';
    };
  }, [label]);

  // data-state continua sendo o que liga o avermelhado e a coroa quente no CSS.
  useEffect(() => {
    if (svg.current) svg.current.dataset.state = estado;
  }, [estado]);

  return <div ref={host} style={{ width: size, height: size, lineHeight: 0 }} aria-hidden="true" />;
}
