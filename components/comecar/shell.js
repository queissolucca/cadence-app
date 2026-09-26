'use client';

import { Icon } from './ui';
import { numeroDoPasso } from '../../lib/comecar/passos';

/* ---- peças de tela reaproveitadas por quase todas as etapas ------------- */

export const Kicker = ({ children, style }) => (
  <span className="kicker" style={style}>{children}</span>
);

/* O rótulo "PASSO N" das telas de pergunta.

   O número vem da lista em lib/comecar/passos.js e NÃO é escrito aqui nem na
   tela. Era literal em cada uma das nove telas que o mostram, e isso fazia a
   numeração se desalinhar em silêncio toda vez que alguém tirasse ou
   acrescentasse uma pergunta: nada quebra, a pessoa só vê "passo 2, passo 4" e
   conclui que o produto é malfeito.

   `extra` é o complemento de algumas telas ("escolha quantos quiser"). */
export const Passo = ({ id, extra, style }) => {
  const n = numeroDoPasso(id);
  if (!n) return extra ? <Kicker style={style}>{extra}</Kicker> : null;
  return <Kicker style={style}>{`Passo ${n}`}{extra ? ` · ${extra}` : ''}</Kicker>;
};

export const Lede = ({ children, style, className = '' }) => (
  <p className={`lede ${className}`.trim()} style={style}>{children}</p>
);

export const Card = ({ children, className = 'card', style }) => (
  <div className={className} style={style}>{children}</div>
);

export const Grow = () => <div className="grow" />;

export const Cta = ({ children, onClick, disabled, className = '', style }) => (
  <button className={`cta ${className}`} onClick={onClick} disabled={disabled} style={style}>
    {children}
  </button>
);

export const Ghost = ({ children, onClick, style }) => (
  <button className="ghost" onClick={onClick} style={style}>{children}</button>
);

export const Field = ({ label, erro, ...rest }) => (
  <div className="field">
    <label>{label}</label>
    <input {...rest} aria-invalid={erro ? 'true' : undefined} className={erro ? 'ruim' : undefined} />
    {erro && <p className="fielderr">{erro}</p>}
  </div>
);

/* O AVISO DE 18+ NAS TELAS DE ENTRAR — TEXTO, NÃO CAIXINHA.

   "Continuar com o Google" nas duas telas de login (/login e a tela Login do
   /comecar) também CRIA conta: o Supabase cria a conta na hora pra um e-mail
   Google que nunca entrou, e o /auth/callback manda direto pro /v2. Esse
   caminho nunca passou pela caixinha do cadastro (a da tela Conta), então a
   pessoa ganhava conta sem ter visto os Termos nem declarado ter 18 anos — e
   a cláusula 2.3 dos Termos se apoia justamente nessa declaração.

   Por que só uma linha de texto, e não a caixinha: estas telas são a porta de
   QUEM JÁ TEM CONTA. Uma caixinha aqui seria uma condição nova pra entrar no
   app, cobrada de todo mundo que volta, pra fechar um caminho que quase só
   acontece por engano. Portão de aceite de verdade (conta sem aceite gravado
   não passa) muda o funil e é decisão do dono, não efeito colateral de um
   ajuste de texto. A linha fica logo abaixo do formulário, colada nos dois
   botões que ela cobre ("Continuar com o Google" e "entrar"). */
export const AvisoTermos = () => (
  <p className="aviso-termos">
    Ao continuar, você declara ter 18 anos ou mais e aceita os{' '}
    <a href="/termos" target="_blank" rel="noreferrer">termos de uso</a> e a{' '}
    <a href="/privacy" target="_blank" rel="noreferrer">política de privacidade</a>.
  </p>
);

/* Marca d'água do topo das telas de abertura. */
export const Wordmark = ({ px = 34 }) => (
  <div className="wm" style={{ fontSize: `${px}px` }}>
    cadence<span className="wmdot" />
  </div>
);

export const Pager = ({ n, total = 3 }) => (
  <div className="pager">
    {Array.from({ length: total }, (_, i) => <i key={i} className={i === n ? 'on' : ''} />)}
  </div>
);

/* Lista de escolha única. `onPick` recebe o valor; quando a etapa avança
   sozinha ao escolher, quem chama passa o `go` dentro do onPick. */
export function Opts({ value, list, onPick }) {
  return (
    <div className="opts">
      {list.map(o => (
        <button key={o.v} className={`opt ${value === o.v ? 'sel' : ''}`}
          onClick={() => onPick(o.v)}>
          {o.ic && (o.ic[0] === '#'
            ? <span className="ic mono">{o.ic.slice(1)}</span>
            : <span className="ic"><Icon name={o.ic} /></span>)}
          <span style={{ minWidth: 0 }}>
            <b>{o.t}{o.badge && <span className="rec">{o.badge}</span>}</b>
            {o.s && <small>{o.s}</small>}
          </span>
          <span className="tick"><Icon name="check" /></span>
        </button>
      ))}
    </div>
  );
}

/* Chips de múltipla escolha (temas). */
export function Chips({ values, list, onToggle }) {
  return (
    <div className="chips">
      {list.map(c => (
        <button key={c.v} className={`chip ${values.includes(c.v) ? 'sel' : ''}`}
          onClick={() => onToggle(c.v)}>
          {c.ic && <Icon name={c.ic} style={{ width: 14, height: 14 }} />}
          {c.v}
        </button>
      ))}
    </div>
  );
}

/* Linha de navegação das seções de Perfil (Personalização, Ajuda). */
export function NavRow({ icon, label, right, onClick }) {
  return (
    <button className="navrow" onClick={onClick}>
      <span className="np"><Icon name={icon} /></span>
      <b>{label}</b>
      {right && <span className="kicker" style={{ flexShrink: 0 }}>{right}</span>}
      <span className="nch"><Icon name="chev" /></span>
    </button>
  );
}

export const NavCard = ({ head, children }) => (
  <div className="navcard">
    <div className="navhead">{head}</div>
    {children}
  </div>
);
