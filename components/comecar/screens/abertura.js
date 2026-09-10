'use client';

import { useEffect, useRef, useState } from 'react';
import { Cady, CadyViva } from '../Cady';
import { Constelacao, Glyph, Icon, WorldMap } from '../ui';
import { Card, Cta, Ghost, Grow, Kicker, Lede, Opts, Pager, Wordmark } from '../shell';
import { LANGS } from '../../../lib/comecar/data';
import { useSpeechRecognition } from '../../../lib/useSpeechRecognition';
import { FRASE_TESTE, compararFala } from '../../../lib/comecar/fala';

export function Splash({ go }) {
  return (
    <div className="scr" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <Grow />
      <Wordmark px={30} />
      <CadyViva size={150} />
      <h1 style={{ marginTop: 18 }}>Oi, eu sou a Cady.</h1>
      <Lede>Cada frase que você fala vira um ponto. Falar de novo conecta os pontos.
        É assim que o inglês vira reflexo.</Lede>
      <Grow />
      <Pager n={0} />
      <Cta onClick={() => go('idioma')}>Começar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

/* Posições espalhadas, sorteadas uma vez por carga: se recalculassem a cada
   render as bandeiras pulariam de lugar ao tocar numa delas. */
function usePosicoes() {
  const ref = useRef(null);
  if (!ref.current) {
    let x = 20260909;
    const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    ref.current = LANGS.map((_, i) => {
      const base = (i / LANGS.length) * Math.PI * 2 - Math.PI / 2;
      return { a: base + (rnd() - 0.5) * 0.40, r: 98 + rnd() * 44, sz: 40 + Math.round(rnd() * 15) };
    });
  }
  return ref.current;
}

export function Idioma({ go, a, set }) {
  const pos = usePosicoes();
  const C = 170;
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <div className="orbit">
        <div className="center"><CadyViva size={118} /></div>
        {LANGS.map(([flag, nome], i) => {
          const { a: ang, r, sz } = pos[i];
          return (
            <button key={nome} className={`lang ${a.idioma === nome ? 'on' : ''}`}
              title={nome} onClick={() => set('idioma', nome)}
              style={{
                left: `${(C + r * Math.cos(ang)).toFixed(1)}px`,
                top: `${(C + r * Math.sin(ang)).toFixed(1)}px`,
                '--ls': `${sz}px`, animationDelay: `${(i * 0.07).toFixed(2)}s`,
              }}>{flag}</button>
          );
        })}
      </div>
      <h1 style={{ marginTop: 14 }}>Aprenda qualquer idioma<br />conversando comigo.</h1>
      <Lede>Toque numa bandeira pra começar por aí. Inglês é o mais pedido — mas eu falo todos.</Lede>
      <Grow />
      <Pager n={1} />
      <Cta onClick={() => go('proposta')}>continuar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

export function Proposta({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <Constelacao lit={5} nodes={[
        { x: 40, y: 120, l: 'dia 1' }, { x: 110, y: 78, l: 'dia 7' }, { x: 180, y: 105, l: 'dia 21' },
        { x: 250, y: 52, l: 'dia 40' }, { x: 308, y: 88, l: 'fluência', below: true },
      ]} />
      <h1>Conversa curta,<br />todo dia.</h1>
      <Lede>Sem aula, sem lição de casa. Você fala 5 minutos comigo e a constelação cresce sozinha.</Lede>
      <Grow />
      <Pager n={2} />
      <Cta onClick={() => go('social')}>continuar</Cta>
      <Ghost onClick={() => go('login')}>já tenho conta · entrar</Ghost>
    </div>
  );
}

/* ATENÇÃO: estes depoimentos são inventados. A tela tinha uma linha dizendo
   "dados ilustrativos · protótipo", que era o que os mantinha honestos, e ela
   foi retirada a pedido — então hoje eles aparecem como se fossem de clientes
   reais, num site que cobra. Isso é exposição sob o CDC (art. 37).

   Trocar por depoimentos de verdade é mudar só este array.

   CAMPOS: n nome · c cor do rosto · f bandeira · d quando avaliou · w há
   quanto tempo usa · t a frase. O campo opcional `nota` (1 a 5) acende as
   estrelas douradas no palco; ele está desligado em todos de propósito —
   depoimento inventado já é uma coisa, uma NOTA inventada é outra, e essa é a
   que o art. 37 pega mais rápido. Quando os depoimentos forem reais, é só
   escrever nota: 5.

   TETO EDITORIAL DE t: ~110 caracteres. O palco trava a frase em três linhas
   (altura fixa, pra o mural logo acima não pular a cada troca); acima disso
   ela trunca com reticências em vez de quebrar o layout.

   As cores saíram de 4 pra 6 (entraram #5FBFB4 e #8E6DE8, que já vêm do
   WM_PEOPLE): com 4 em rodízio o mural fica com dois verdes quase iguais
   colados um no outro. */
const DEPOIMENTOS = [
  { n: 'Marina L.',  nota: 5, c: '#3E9B5F', f: '🇧🇷', d: 'hoje',        w: '8 semanas', t: 'Reunião em inglês era pânico. Hoje eu abro a câmera e falo.' },
  { n: 'Rafael T.',  nota: 5, c: '#2c7347', f: '🇧🇷', d: 'há 1 dia',    w: '3 semanas', t: 'O formato de 5 minutos foi o único que eu consegui manter.' },
  { n: 'Camila V.',  nota: 5, c: '#a5760a', f: '🇧🇷', d: 'há 2 dias',   w: '8 semanas', t: 'Viajei e pedi tudo sozinha. Sem tradutor, sem gaguejar.' },
  { n: 'Juliana P.', nota: 4, c: '#D9527A', f: '🇧🇷', d: 'há 2 dias',   w: '2 semanas', t: 'A correção na hora é o que faltava. Eu errava e ninguém dizia nada.' },
  { n: 'Diego M.',   nota: 5, c: '#5FBFB4', f: '🇧🇷', d: 'há 3 dias',   w: '3 semanas', t: 'Parei de montar a frase na cabeça antes de falar. Agora ela sai.' },
  { n: 'Thiago A.',  nota: 5, c: '#8E6DE8', f: '🇧🇷', d: 'há 4 dias',   w: '8 semanas', t: 'A daily do time deixou de ser o pior momento do meu dia.' },
  { n: 'Beatriz S.', nota: 4, c: '#3E9B5F', f: '🇧🇷', d: 'há 5 dias',   w: '3 semanas', t: 'Eu entendia tudo e não respondia nada. Isso acabou.' },
  { n: 'Amanda R.',  nota: 5, c: '#a5760a', f: '🇧🇷', d: 'há 1 semana', w: '2 semanas', t: 'Cinco minutos antes de dormir. Virou hábito sem eu perceber.' },
  { n: 'Lucas F.',   nota: 5, c: '#D9527A', f: '🇧🇷', d: 'há 1 semana', w: '8 semanas', t: 'Tive entrevista em inglês semana passada. Não travei uma vez.' },
  { n: 'Pedro H.',   nota: 4, c: '#5FBFB4', f: '🇧🇷', d: 'há 2 semanas', w: '3 semanas', t: 'O sotaque continua. Travar, não — e era isso que me atrapalhava.' },
];

/* 5200ms = 2 × 2,6s, a batida da casa (pt-beat, halo). O palco troca sempre na
   mesma fase do murmúrio do mural: um relógio só pra tela inteira. */

/* CSS não para um setTimeout, então o modo calmo precisa ser lido no JS. Com
   listener de 'change' pra atender quem liga a preferência com a tela aberta.
   Lido dentro do efeito e não no corpo: matchMedia não existe no servidor. */

/* Mural de vozes.

   A versão anterior empilhava os 10 depoimentos: 1378px de tela contra 483px
   de espaço no iPhone SE, ou seja, o botão "continuar" nascia 895px abaixo da
   dobra e ninguém via prova social nenhuma — via um paredão de texto parado.

   Aqui os 10 estão TODOS na tela o tempo todo, como dez rostos quadrados que
   murmuram na batida de 2,6s da casa (o mesmo pt-beat dos pontos da
   constelação, com atraso de n × 0,26s: 10 × 0,26 = 2,6s exatos, então a luz
   atravessa o mural em onda contínua e nunca reinicia). Embaixo, um palco
   mostra uma pessoa por vez e troca sozinho.

   Três fontes de vida em cadências diferentes — a onda do mural, a barra do
   palco e a Cady do cabeçalho, que segue o dedo. Nada com TEXTO dentro se
   desloca: depoimento que se move é depoimento que não se lê. */
export function Social({ go }) {
  const fila = useRef(null);
  const [pulando, setPulando] = useState(-1);

  /* Arrastar com o MOUSE. No toque o navegador já rola sozinho, e interceptar
     ali só atrapalharia (roubaria o gesto vertical da página). Por isso o
     arraste manual é só pra ponteiro de mouse. */
  useEffect(() => {
    const el = fila.current;
    if (!el) return undefined;
    let ativo = false, x0 = 0, s0 = 0, andou = 0;

    const desce = e => {
      if (e.pointerType !== 'mouse') return;
      ativo = true; andou = 0;
      x0 = e.clientX; s0 = el.scrollLeft;
      el.classList.add('arrastando');
    };
    const move = e => {
      if (!ativo) return;
      const d = e.clientX - x0;
      andou = Math.max(andou, Math.abs(d));
      el.scrollLeft = s0 - d;
    };
    const sobe = () => {
      if (!ativo) return;
      ativo = false;
      el.classList.remove('arrastando');
      // Arrastou de verdade? Então o clique que vem a seguir é resíduo do
      // gesto, não intenção — senão o cartão "pula" toda vez que se arrasta.
      if (andou > 6) {
        const comer = ev => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener('click', comer, { capture: true, once: true });
        setTimeout(() => el.removeEventListener('click', comer, { capture: true }), 60);
      }
    };

    el.addEventListener('pointerdown', desce);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', sobe);
    window.addEventListener('pointercancel', sobe);
    return () => {
      el.removeEventListener('pointerdown', desce);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', sobe);
      window.removeEventListener('pointercancel', sobe);
    };
  }, []);

  // O pulo é uma classe que sai sozinha: repetir o clique tem que repetir a
  // animação, e uma classe que ficasse grudada só animaria na primeira vez.
  const pular = n => {
    setPulando(n);
    setTimeout(() => setPulando(v => (v === n ? -1 : v)), 380);
  };

  return (
    <div className="scr">
      <div className="vzhead">
        <CadyViva size={52} />
        <div className="vzhd">
          <Kicker>quem já está falando</Kicker>
          <h2>Quem parou de travar</h2>
        </div>
      </div>

      {/* Fila horizontal com encaixe: no celular o dedo já arrasta nativo, e o
          scroll-snap faz cada cartão parar centralizado em vez de meio fora. */}
      <div className="vzrow" ref={fila}>
        {DEPOIMENTOS.map((p, n) => (
          <button key={p.n} type="button"
            className={`quote vzcard ${pulando === n ? 'pulo' : ''}`}
            style={{ '--k': p.c }} onClick={() => pular(n)}
            aria-label={`depoimento de ${p.n}, ${p.nota} de 5 estrelas`}>
            <span className="vzwho">
              <span className="vzav"><b>{p.n[0]}</b></span>
              <span className="vzid">
                <b>{p.n}</b>
                <small>{p.w} de uso</small>
              </span>
            </span>
            <span className="lstars" aria-hidden="true">{'★'.repeat(p.nota)}<i>{'★'.repeat(5 - p.nota)}</i></span>
            <span className="vzq">&ldquo;{p.t}&rdquo;</span>
          </button>
        ))}
      </div>

      <p className="vzhint">arraste para ver os outros</p>

      <Grow />
      <Cta onClick={() => go('audio')}>continuar</Cta>
    </div>
  );
}

export function Audio({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 2</Kicker>
      <h1 style={{ marginTop: 8 }}>Posso falar em voz alta com você?</h1>
      <Lede>Eu aprendo mais rápido ouvindo você — mas você manda no volume.</Lede>
      <Opts value={a.audio} onPick={v => { set('audio', v); go('nivel'); }} list={[
        { v: 'sempre', t: 'Pode falar sempre', s: 'a conversa inteira em voz', ic: 'volHigh' },
        { v: 'exercicios', t: 'Só nos exercícios', s: 'o resto eu leio', ic: 'volLow' },
        { v: 'mudo', t: 'Prefiro no silêncio', s: 'só texto por enquanto', ic: 'volOff' },
      ]} />
      <Grow />
      <Kicker style={{ textAlign: 'center' }}>você muda isso quando quiser</Kicker>
    </div>
  );
}

export function Nivel({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 3</Kicker>
      <h1 style={{ marginTop: 8 }}>Onde você está hoje?</h1>
      <Opts value={a.nivel} onPick={v => { set('nivel', v); go('fala'); }} list={[
        { v: 'zero', t: 'Começando do zero', s: 'quase nenhuma palavra', ic: 'sprout' },
        { v: 'basico', t: 'Entendo, mas não falo', s: 'leio e escuto razoável', ic: 'eye' },
        { v: 'medio', t: 'Falo travando', s: 'me viro, mas penso demais', ic: 'chat' },
        { v: 'avancado', t: 'Falo bem', s: 'quero soltar e ganhar naturalidade', ic: 'wave' },
      ]} />
      <Grow />
    </div>
  );
}

/* Gravação simulada: o protótipo não escuta de verdade, e o site paralelo
   também não — o microfone real entra quando isso encostar na infra do Cadence.
   O que importa aqui é o gesto: tocar, ver a onda reagir, tocar de novo. */
/* O microfone tem dois modos. Com `reconhecer`, ele usa a Web Speech API e
   entrega o que a pessoa realmente falou; sem, é só a animação (a primeira
   lição é roteirizada de propósito — ver o comentário em LicaoFala).

   O fallback importa: Firefox não tem a API, e em qualquer navegador a pessoa
   pode negar o microfone. Nesses casos a tela continua andando e o feedback diz
   que não ouviu, em vez de inventar um resultado. */
export function Mic({ onDone, reconhecer = false, hintInicial = 'toque para falar', hintOuvindo, hintFim }) {
  const [fase, setFase] = useState('parado');
  const ondas = useRef(null);
  const fala = useSpeechRecognition({ lang: 'en-US' });
  const ouvido = useRef('');
  // O transcript chega em pedaços e some quando a sessão encerra; guardo o
  // último não-vazio pra não entregar string vazia a quem só lê no fim.
  if (reconhecer && fala.transcript) ouvido.current = fala.transcript;

  useEffect(() => {
    if (fase !== 'ouvindo' || !ondas.current) return;
    [...ondas.current.children].forEach(i => {
      i.style.animationDelay = `${Math.random() * 0.85}s`;
    });
  }, [fase]);

  useEffect(() => {
    if (fase !== 'fim') return undefined;
    const t = setTimeout(() => onDone(ouvido.current.trim()), 1300);
    return () => clearTimeout(t);
  }, [fase, onDone]);

  const hint = fase === 'parado' ? hintInicial
    : fase === 'ouvindo' ? hintOuvindo : hintFim;

  return (
    <>
      <div className={`wave ${fase === 'ouvindo' ? '' : 'off'}`} ref={ondas}>
        {Array.from({ length: 21 }, (_, i) => <i key={i} />)}
      </div>
      <button className={`mic ${fase === 'ouvindo' ? 'rec' : ''}`} style={{ marginTop: 14 }}
        disabled={fase === 'fim'}
        onClick={() => {
          if (reconhecer && fala.supported) fala.toggle();
          setFase(fase === 'parado' ? 'ouvindo' : 'fim');
        }}>
        {fase === 'parado' && <Glyph name="mic" size={34} />}
        {fase === 'ouvindo' && <Glyph name="stop" size={26} />}
        {fase === 'fim' && <Glyph name="clock" size={28} />}
      </button>
      <Kicker style={{ marginTop: 16 }}>{hint}</Kicker>
    </>
  );
}

export function Fala({ go, set }) {
  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>Teste rápido</Kicker>
      <h2 style={{ marginTop: 10 }}>Repete comigo:</h2>
      <Card className="card-dark" style={{ background: 'var(--dark-soft)', marginTop: 18 }}>
        <p style={{ fontFamily: 'var(--f-display)', fontSize: 21, lineHeight: 1.35 }}>
          &ldquo;I&rsquo;d like a table for two, please.&rdquo;</p>
        <Lede style={{ marginTop: 8, fontSize: 13 }}>uma mesa para dois, por favor</Lede>
      </Card>
      <Grow />
      <Mic reconhecer onDone={texto => { set('fala', texto); go('feedback'); }}
        hintOuvindo="estou te ouvindo… toque quando terminar"
        hintFim="analisando sua fala…" />
      <Grow />
    </div>
  );
}

const chipApagado = {
  fontSize: 11.5, padding: '6px 12px', background: 'transparent',
  borderColor: 'var(--dk-line)', color: 'var(--dk-soft)',
};

export function Feedback({ go, a }) {
  const r = compararFala(a.fala);

  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Kicker>{r.ouviu ? 'Você disse' : 'A frase era'}</Kicker>
      <Card className="card-dark"
        style={{ background: 'var(--dark-soft)', marginTop: 12, textAlign: 'left' }}>
        <p style={{ fontFamily: 'var(--f-display)', fontSize: 19 }}>
          &ldquo;{r.ouviu ? r.disse : FRASE_TESTE}&rdquo;</p>
        {r.ouviu && (
          <div style={{ display: 'flex', gap: 7, marginTop: 13, flexWrap: 'wrap' }}>
            <span className={`chip ${r.completa ? 'sel' : ''}`}
              style={r.completa ? { fontSize: 11.5, padding: '6px 12px' } : chipApagado}>
              {r.acertou} de {r.alvo.length} palavras
            </span>
            {!r.completa && (
              <span className="chip" style={chipApagado}>
                faltou: {r.faltando.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        )}
      </Card>
      <CadyViva size={150} />
      {r.ouviu ? (
        <>
          <h2>{r.completa ? 'Olha só — saiu inteira.' : 'Boa — já dá pra trabalhar em cima disso.'}</h2>
          <Lede>Esse é o ponto de partida. Agora eu preciso saber pra onde você quer ir.</Lede>
        </>
      ) : (
        <>
          <h2>Não consegui te ouvir agora.</h2>
          <Lede>Pode ter sido o microfone ou o navegador — a gente faz esse teste na
            primeira conversa. Segue que o resto não depende disso.</Lede>
        </>
      )}
      <Grow />
      <Cta onClick={() => go('conquista1')}>continuar</Cta>
    </div>
  );
}

export function Conquista1({ go }) {
  return (
    <div className="scr" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <Grow />
      <Kicker>Primeiro ponto aceso</Kicker>
      <div className="medal" style={{ marginTop: 16 }}><Glyph name="spark" size={40} /></div>
      <h1 style={{ marginTop: 20 }}>1ª frase falada</h1>
      <Lede>Você não estudou uma regra. Você falou. É exatamente assim que a gente vai continuar.</Lede>
      <Constelacao lit={1} nodes={[
        { x: 60, y: 95, l: 'você está aqui' }, { x: 150, y: 70, l: '' },
        { x: 240, y: 100, l: '' }, { x: 300, y: 64, l: '' },
      ]} />
      <Grow />
      <Cta onClick={() => go('objetivo')}>bora montar meu plano</Cta>
    </div>
  );
}
