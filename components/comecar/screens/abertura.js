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

const DEPOIMENTOS = [
  { n: 'Marina L.', c: '#3E9B5F', t: 'Reunião em inglês era pânico. Hoje eu abro a câmera e falo.', w: '6 semanas' },
  { n: 'Rafael T.', c: '#2c7347', t: 'O formato de 5 minutos foi o único que eu consegui manter.', w: '3 meses' },
  { n: 'Camila V.', c: '#a5760a', t: 'Viajei e pedi tudo sozinha. Sem tradutor, sem gaguejar.', w: '2 meses' },
];

export function Social({ go }) {
  return (
    <div className="scr">
      <Kicker>Quem já está falando</Kicker>
      <h2 style={{ marginTop: 8 }}>Gente que parou de travar</h2>
      {DEPOIMENTOS.map(q => (
        <div className="quote" key={q.n}>
          <div className="who">
            <span className="av" style={{ background: q.c }}>{q.n[0]}</span>
            <span><b>{q.n}</b><small>{q.w} de cadência</small></span>
          </div>
          <p>&ldquo;{q.t}&rdquo;</p>
        </div>
      ))}
      <p className="lede mono" style={{ fontSize: 11, marginTop: 14 }}>dados ilustrativos · protótipo</p>
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
