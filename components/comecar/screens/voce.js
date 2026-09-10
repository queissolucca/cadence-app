'use client';

import { useEffect, useRef, useState } from 'react';
import { CadyViva } from '../Cady';
import { Icon } from '../ui';
import { Card, Grow, Kicker, NavCard, NavRow, Opts } from '../shell';
import { agrupar, memorias } from '../../../lib/comecar/state';

const TONS = [
  { v: 'agressivo', t: 'Agressivo', badge: 'recomendado',
    s: 'correção direta — você aprende apanhando', ic: 'flame' },
  { v: 'normal', t: 'Normal', s: 'conversa tranquila, professor paciente', ic: 'leaf' },
];

/* Folha de memórias: o que a Cady lembra de você, agrupado por assunto.
   Adicionar, editar inline, apagar. Fecha no X, no escuro em volta e no Esc. */
function FolhaMemorias({ itens, onMudar, onFechar }) {
  const [editando, setEditando] = useState(-1);
  const [novo, setNovo] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const campoNovo = useRef(null);
  const campoEdit = useRef(null);

  useEffect(() => {
    const aoTeclar = e => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  useEffect(() => { if (novo) campoNovo.current?.focus(); }, [novo]);
  useEffect(() => {
    if (editando < 0) return;
    const el = campoEdit.current;
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, [editando]);

  const adicionar = e => {
    e.preventDefault();
    const v = rascunho.trim();
    if (v) onMudar([...itens, { g: 'Suas anotações', t: v }]);
    setRascunho(''); setNovo(false);
  };

  const salvar = i => {
    const v = campoEdit.current.value.trim();
    // salvar vazio apaga: é o que a pessoa quis dizer ao limpar o campo
    onMudar(v ? itens.map((m, k) => (k === i ? { ...m, t: v } : m))
               : itens.filter((_, k) => k !== i));
    setEditando(-1);
  };

  const apagar = i => { onMudar(itens.filter((_, k) => k !== i)); setEditando(-1); };

  return (
    <div className="sheetbg" onClick={e => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="sheet" role="dialog" aria-label="Suas memórias">
        <button className="sheetx" onClick={onFechar} aria-label="Fechar">×</button>
        <h2>Suas memórias</h2>
        <p className="sub">O que a Cady lembra de você. Adicione, edite ou apague o que quiser.</p>

        {novo ? (
          <form className="memadd" onSubmit={adicionar} style={{ marginTop: 14 }}>
            <input ref={campoNovo} type="text" maxLength={160} autoComplete="off"
              value={rascunho} onChange={e => setRascunho(e.target.value)}
              placeholder="ex: minha chefe é americana" />
            <button type="submit">salvar</button>
          </form>
        ) : (
          <button className="memnew" onClick={() => setNovo(true)}>
            <Icon name="plus" />Adicionar memória
          </button>
        )}

        <div className="sheetscroll">
          {itens.length ? agrupar(itens).map(g => (
            <div key={g.nome}>
              <div className="memgrp">{g.nome}</div>
              <ul className="memlist" style={{ marginTop: 0 }}>
                {g.itens.map(m => (
                  <li className="mem" key={m.i}>
                    <span className="memdot" />
                    {editando === m.i ? (
                      <>
                        <input className="memedit" ref={campoEdit} defaultValue={m.t} maxLength={160}
                          onKeyDown={e => { if (e.key === 'Enter') salvar(m.i); }} />
                        <span className="memact">
                          <button className="mm-ed" onClick={() => salvar(m.i)} title="Salvar">
                            <Icon name="check" /></button>
                          <button className="mm-rm" onClick={() => setEditando(-1)} title="Cancelar">×</button>
                        </span>
                      </>
                    ) : (
                      <>
                        <p>{m.t}</p>
                        <span className="memact">
                          <button className="mm-ed" onClick={() => setEditando(m.i)} title="Editar">
                            <Icon name="pencil" /></button>
                          <button className="mm-rm" onClick={() => apagar(m.i)} title="Apagar">
                            <Icon name="trash" /></button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )) : (
            <p className="memempty">Não estou guardando nada por enquanto. O que você escrever
              aqui eu levo pras próximas conversas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Voce({ a, set }) {
  const [folha, setFolha] = useState(null);
  const itens = memorias(a);

  return (
    <>
      <div className="scr">
        <h2>Você</h2>
        <Card style={{ marginTop: 14, display: 'flex', gap: 13, alignItems: 'center' }}>
          <div style={{ flexShrink: 0, width: 52 }}><CadyViva size={52} /></div>
          <span><b style={{ fontSize: 15 }}>Sua conta</b>
            <small style={{ display: 'block', fontSize: 12.5, color: 'var(--dk-soft)', marginTop: 2 }}>
              dia 1 · {a.min || 5} min por dia</small></span>
        </Card>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22,
        }}>
          <h2 style={{ fontSize: 14 }}>Tonalidade das correções</h2>
          <Kicker>ajustável</Kicker>
        </div>
        <Opts value={a.tom} list={TONS} onPick={v => set('tom', v)} />

        <NavCard head="Personalização">
          <NavRow icon="brain" label="Suas memórias" right={itens.length || 'vazia'}
            onClick={() => setFolha('mem')} />
        </NavCard>

        <NavCard head="Ajuda">
          <NavRow icon="plane" label="Enviar feedback" onClick={() => {}} />
          <NavRow icon="shield" label="Privacidade e dados" onClick={() => {}} />
        </NavCard>

        <Card style={{ marginTop: 12 }}>
          <Kicker>Suas respostas</Kicker>
          <div style={{ marginTop: 6 }}>
            <div className="setrow"><span><b>Minutos por dia</b><small>ritmo do ritual</small></span>
              <span className="val">{a.min || 5} min</span></div>
            <div className="setrow"><span><b>Horário</b><small>quando eu te chamo</small></span>
              <span className="val">{a.horario || 'sem hora fixa'}</span></div>
            <div className="setrow"><span><b>Áudio</b><small>como eu falo com você</small></span>
              <span className="val">{a.audio || 'sempre'}</span></div>
            <div className="setrow"><span><b>Temas</b><small>assuntos das conversas</small></span>
              <span className="val">{a.temas.length || 0} ativos</span></div>
          </div>
        </Card>
        <Grow />
      </div>

      {folha === 'mem' && (
        <FolhaMemorias itens={itens} onFechar={() => setFolha(null)}
          onMudar={m => set('mem', m)} />
      )}
    </>
  );
}
