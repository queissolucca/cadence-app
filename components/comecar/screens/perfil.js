'use client';

import { useEffect, useRef, useState } from 'react';
import { Cady, CadyViva } from '../Cady';
import { CurveChart } from '../CurveChart';
import { Icon, Laurel, WorldMap } from '../ui';
import { Card, Cta, Ghost, Grow, Kicker, Lede, Opts } from '../shell';
import { TEMAS } from '../../../lib/comecar/data';
import { addDias, fmt, metaDias } from '../../../lib/comecar/datas';

const passo = (go, set, chave, destino) => v => { set(chave, v); go(destino); };

export function Objetivo({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 4</Kicker>
      <h1 style={{ marginTop: 8 }}>Pra que você quer o inglês?</h1>
      <Opts value={a.objetivo} onPick={passo(go, set, 'objetivo', 'bloqueio')} list={[
        { v: 'Viagem', t: 'Viajar sem depender de ninguém', ic: 'plane' },
        { v: 'Carreira', t: 'Trabalho e carreira', ic: 'briefcase' },
        { v: 'Conversar', t: 'Conversar sem travar', ic: 'chat' },
        { v: 'Prova', t: 'Prova ou certificação', ic: 'cap' },
      ]} />
      <Grow />
    </div>
  );
}

export function Bloqueio({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 5</Kicker>
      <h1 style={{ marginTop: 8 }}>O que mais te trava?</h1>
      <Opts value={a.bloqueio} onPick={passo(go, set, 'bloqueio', 'hoje')} list={[
        { v: 'Vergonha de errar', t: 'Vergonha de errar', ic: 'scales' },
        { v: 'Falta de repertório', t: 'Não sei o que responder', ic: 'dots' },
        { v: 'Falta de prática', t: 'Não tenho com quem praticar', ic: 'people' },
        { v: 'Congelo na hora', t: 'Congelo na hora H', ic: 'snow' },
      ]} />
      <Grow />
    </div>
  );
}

export function Hoje({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 6</Kicker>
      <h1 style={{ marginTop: 8 }}>Quanto você fala inglês em voz alta por semana?</h1>
      <Lede>Em voz alta mesmo — não vale ler ou assistir série.</Lede>
      <Opts value={a.hoje} onPick={passo(go, set, 'hoje', 'prazo')} list={[
        { v: '0', t: 'Zero', s: 'faz tempo que não abro a boca', ic: 'zzz' },
        { v: '-10', t: 'Menos de 10 minutos', ic: 'clock' },
        { v: '10-60', t: 'Entre 10 e 60 minutos', ic: 'bars2' },
        { v: '60+', t: 'Mais de 1 hora', ic: 'flame' },
      ]} />
      <Grow />
    </div>
  );
}

export function Prazo({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 7</Kicker>
      <h1 style={{ marginTop: 8 }}>Em quanto tempo você quer estar solto?</h1>
      <Opts value={a.prazo} onPick={passo(go, set, 'prazo', 'horario')} list={[
        { v: '1', t: '1 mês', s: 'ritmo intenso', ic: 'zap' },
        { v: '3', t: '3 meses', s: 'recomendado pra maioria', ic: 'star' },
        { v: '6', t: '6 meses', s: 'tranquilo e constante', ic: 'leaf' },
      ]} />
      <Grow />
    </div>
  );
}

export function Horario({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 8</Kicker>
      <h1 style={{ marginTop: 8 }}>Que horas eu te chamo?</h1>
      <Opts value={a.horario} onPick={passo(go, set, 'horario', 'minutos')} list={[
        { v: 'manha', t: 'De manhã', s: 'antes do dia engolir você', ic: 'sun' },
        { v: 'almoco', t: 'No almoço', ic: 'bowl' },
        { v: 'noite', t: 'À noite', ic: 'moon' },
        { v: 'livre', t: 'Sem hora fixa', s: 'eu te lembro de leve', ic: 'shuffle' },
      ]} />
      <Grow />
    </div>
  );
}

export function Minutos({ go, a, set }) {
  return (
    <div className="scr">
      <Kicker>Passo 9</Kicker>
      <h1 style={{ marginTop: 8 }}>Quantos minutos cabem no seu dia?</h1>
      <Opts value={a.min} onPick={passo(go, set, 'min', 'temas')} list={[
        { v: 5, t: '5 minutos', s: 'uma conversa curta', ic: 'bars1' },
        { v: 10, t: '10 minutos', s: 'o ritmo mais comum', ic: 'bars2' },
        { v: 20, t: '20 minutos', s: 'pra acelerar', ic: 'bars3' },
        { v: 30, t: '30 minutos', s: 'modo turbo', ic: 'bars4' },
      ]} />
      <Grow />
    </div>
  );
}

export function Temas({ go, a, set }) {
  const alterna = v => {
    const t = a.temas.includes(v) ? a.temas.filter(x => x !== v) : [...a.temas, v];
    set('temas', t);
  };
  return (
    <div className="scr">
      <Kicker>Passo 10 · escolha quantos quiser</Kicker>
      <h1 style={{ marginTop: 8 }}>Sobre o que a gente conversa?</h1>
      <div className="opts">
        {TEMAS.map(t => (
          <button key={t.v} className={`opt ${a.temas.includes(t.v) ? 'sel' : ''}`}
            onClick={() => alterna(t.v)}>
            <span className="ic"><Icon name={t.ic} /></span>
            <span style={{ minWidth: 0 }}><b>{t.v}</b></span>
            <span className="tick"><Icon name="check" /></span>
          </button>
        ))}
      </div>
      <Grow />
      <Cta disabled={!a.temas.length} onClick={() => go('projecao')}>
        continuar{a.temas.length ? ` (${a.temas.length})` : ''}
      </Cta>
    </div>
  );
}

export function Projecao({ go, a }) {
  const dias = metaDias(a.min);
  return (
    <div className="scr">
      <div style={{ textAlign: 'center' }}><CadyViva size={88} /></div>
      <h1 style={{ textAlign: 'center', marginTop: 2 }}>Dá pra sentir a diferença<br />em 2 semanas.</h1>
      <Lede style={{ textAlign: 'center' }}>
        Sem conversar, a confiança fica onde está. Falando comigo {a.min || 5} minutos por dia, ela sobe.
      </Lede>
      <CurveChart fim="semana 2" />
      <Kicker style={{ textAlign: 'center', marginTop: 12 }}>
        mantendo o ritmo, sua meta é {fmt(addDias(dias))}
      </Kicker>
      <Grow />
      <Cta onClick={() => go('gerando')}>continuar</Cta>
    </div>
  );
}

/* ---- gerando plano ------------------------------------------------------
   Três painéis, 3s cada, 9s no total. O anel, o % e o passo ficam parados (são
   a âncora); o que troca é o painel de baixo, mostrando aquela etapa acontecer
   com as respostas da pessoa. Anda pelo relógio, não por incremento aleatório:
   com % aleatório a etapa durava o que a sorte mandasse. */
const PHASE_MS = 3000;
const GEN_STEPS = [
  'Ligando os seus pontos…',
  'Calibrando pelo seu nível…',
  'Personalizando seu plano de aprendizado…',
];
const NIVEIS = ['básico', 'ok', 'bom', 'solto'];
const NIVEL_DE = { zero: 'básico', basico: 'ok', medio: 'bom', avancado: 'solto' };

function Painel({ i, a }) {
  if (i === 0) {
    return (
      <>
        <p className="gcap">pessoas conversando comigo agora</p>
        <WorldMap />
      </>
    );
  }
  if (i === 1) {
    const at = Math.max(0, NIVEIS.indexOf(NIVEL_DE[a.nivel] || 'ok'));
    return (
      <>
        <p className="gcap">onde você começa</p>
        <div className="glevel">
          {NIVEIS.map((_, k) => (
            <i key={k} className={k <= at ? 'on' : ''}
              style={{ height: 28 + k * 15, animationDelay: `${(k * 0.1).toFixed(2)}s` }} />
          ))}
        </div>
        <div className="glbl">{NIVEIS.map(n => <span key={n}>{n}</span>)}</div>
      </>
    );
  }
  return (
    <>
      <p className="gcap">seu ritual</p>
      <div className="gsum">
        <div style={{ animationDelay: '0s' }}><b>Conversa por dia</b><span>{a.min || 5} min</span></div>
        <div style={{ animationDelay: '.09s' }}><b>Quando eu te chamo</b><span>{a.horario || 'sem hora fixa'}</span></div>
        <div style={{ animationDelay: '.18s' }}><b>Como eu te corrijo</b><span>{a.tom || 'agressivo'}</span></div>
        <div style={{ animationDelay: '.27s' }}><b>Revisão</b><span>hoje · amanhã · 1 sem · 1 mês</span></div>
      </div>
    </>
  );
}

export function Gerando({ go, a }) {
  const [ms, setMs] = useState(0);
  const TOTAL = PHASE_MS * GEN_STEPS.length;
  const i = Math.min(GEN_STEPS.length - 1, Math.floor(ms / PHASE_MS));
  // a calibragem é a única etapa que fala do nível de quem está esperando —
  // é onde a reação dela faz sentido
  const CALIBRA = 1;

  useEffect(() => {
    if (ms >= TOTAL) {
      const t = setTimeout(() => go('diagnostico'), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setMs(v => Math.min(TOTAL, v + 100)), 100);
    return () => clearTimeout(t);
  }, [ms, TOTAL, go]);

  return (
    <div className="scr" style={{ textAlign: 'center' }}>
      <Grow />
      <div className="genwrap">
        <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="rtrack" cx="50" cy="50" r="47" />
          <circle className="rbar" cx="50" cy="50" r="47" pathLength="1"
            style={{ strokeDashoffset: (1 - ms / TOTAL).toFixed(3) }} />
        </svg>
        <Cady size={118} expression={i === CALIBRA ? 'timida' : 'pensando'} />
      </div>
      <p className="genpct">{Math.round(ms / TOTAL * 100)}<i>%</i></p>
      <p className="genstep">{GEN_STEPS[i]}</p>
      <div className="genpanel" key={i}><Painel i={i} a={a} /></div>
      <Laurel frase="Esse será o melhor aplicativo de idiomas do ano"
        sub="Criado por brasileiros, para brasileiros" />
      <Grow />
    </div>
  );
}

export function Diagnostico({ go, a }) {
  return (
    <div className="scr">
      <Kicker>O que eu entendi de você</Kicker>
      <h1 style={{ marginTop: 8 }}>
        Seu nó é <span style={{ color: 'var(--cady-coroa)' }}>
          {(a.bloqueio || 'travar na hora').toLowerCase()}</span>.
      </h1>
      <Lede>Então o plano inteiro é montado pra atacar isso — não pra você decorar gramática.</Lede>
      <Card className="card-green" style={{ marginTop: 18 }}>
        <Kicker>Como eu ataco</Kicker>
        <div className="ritual">
          <div className="rit"><span className="knot" /><span><b>Aquecer</b>
            <small>frases fáceis pra soltar a língua</small></span><span className="dur">1 min</span></div>
          <div className="rit"><span className="knot" /><span><b>Conversar</b>
            <small>{a.temas[0] || 'situação real'} — sem roteiro</small></span>
            <span className="dur">{Math.max(3, (a.min || 5) - 2)} min</span></div>
          <div className="rit"><span className="knot" /><span><b>Revisar</b>
            <small>o que travou volta amanhã</small></span><span className="dur">1 min</span></div>
        </div>
      </Card>
      <Grow />
      <Cta onClick={() => go('licao-brief')}>quero ver funcionando</Cta>
    </div>
  );
}
