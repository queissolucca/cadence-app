'use client';

import { useCallback, useEffect, useState } from 'react';
import { Constellation } from './Constellation';
import { SphereDefs } from './ui';
import { useEstado } from '../../lib/comecar/state';
import { ORDEM, SCREENS, TABS, acharTela } from '../../lib/comecar/flow';

export function App() {
  const { a, set, patch, reset } = useEstado();
  // Lido depois da montagem, e não com useSearchParams: aquele hook faz o Next
  // abandonar a renderização no servidor e mandar o fallback, o que deixaria a
  // página sem conteúdo nenhum na resposta HTML.
  const [dev, setDev] = useState(false);
  useEffect(() => {
    setDev(new URLSearchParams(location.search).get('dev') === '1');
  }, []);

  const [cur, setCur] = useState('splash');
  const [hist, setHist] = useState([]);

  const go = useCallback(id => {
    setCur(atual => {
      if (id !== atual) setHist(h => [...h, atual]);
      return id;
    });
  }, []);

  const voltar = () => setHist(h => {
    if (!h.length) return h;
    setCur(h[h.length - 1]);
    return h.slice(0, -1);
  });

  // rolagem volta ao topo a cada tela — sem isso a pessoa cai no meio da
  // próxima quando a anterior era longa
  useEffect(() => {
    document.getElementById('view')?.scrollTo(0, 0);
  }, [cur]);

  const tela = acharTela(cur);
  const Comp = tela.C;

  // trilha de progresso: 12 pontos que acompanham a posição no fluxo
  const i = ORDEM.indexOf(cur), N = 12;
  const at = Math.round((i / (ORDEM.length - 1)) * (N - 1));

  return (
    <>
      <SphereDefs />
      <div id="phone" className="dark">
        <Constellation />

        <div id="trail" className={tela.bare ? 'hide' : ''}>
          <button className="back" onClick={voltar} disabled={!hist.length}>‹</button>
          <div className="nodes">
            <span className="wire" />
            <span className="wire-on" style={{ width: `${(at / (N - 1)) * 100}%` }} />
            {Array.from({ length: N }, (_, k) => (
              <span key={k} className={`pt ${k < at ? 'on' : ''} ${k === at ? 'now' : ''}`}
                style={{ left: `${(k / (N - 1)) * 100}%` }} />
            ))}
          </div>
        </div>

        <div id="view">
          <Comp key={cur} go={go} a={a} set={set} patch={patch} />
        </div>

        {tela.tab && (
          <div className="tabbar">
            {TABS.map(([t, destino]) => (
              <button key={destino} className={`tab ${destino === cur ? 'on' : ''}`}
                onClick={() => go(destino)}>
                <span className="tdot" />{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {dev && (
        <aside id="side">
          <h4>Cadence</h4>
          <p className="hint">Índice de desenvolvimento. Clique numa tela pra pular direto.</p>
          <div id="idx">
            {SCREENS.map((s, k) => {
              const novoGrupo = k === 0 || SCREENS[k - 1].grp !== s.grp;
              return (
                <div key={s.id}>
                  {novoGrupo && <div className="grp">{s.grp}</div>}
                  <a className={s.id === cur ? 'on' : ''} onClick={() => go(s.id)}>
                    <i>{String(k + 1).padStart(2, '0')}</i>{s.name}
                  </a>
                </div>
              );
            })}
          </div>
          <div className="side-foot">
            <button className="reset" onClick={() => { reset(); setCur('splash'); setHist([]); }}>
              Reiniciar fluxo
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
