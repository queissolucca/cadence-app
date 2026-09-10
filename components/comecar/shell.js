'use client';

import { Icon } from './ui';

/* ---- peças de tela reaproveitadas por quase todas as etapas ------------- */

export const Kicker = ({ children, style }) => (
  <span className="kicker" style={style}>{children}</span>
);

export const Lede = ({ children, style }) => <p className="lede" style={style}>{children}</p>;

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

export const Field = ({ label, ...rest }) => (
  <div className="field">
    <label>{label}</label>
    <input {...rest} />
  </div>
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
