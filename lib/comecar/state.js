'use client';

import { createContext, useContext, useEffect, useState } from 'react';

/* Respostas do onboarding e memórias. No protótipo isso era um objeto solto que
   sumia ao recarregar; aqui vive num contexto e é persistido no navegador.
   localStorage e não Supabase de propósito: este site é paralelo ao Cadence e
   ainda não tem conta de verdade — quando as duas infraestruturas se juntarem,
   só a implementação de `save` muda, o resto da árvore não sabe a diferença. */
const CHAVE = 'cadence.onboarding.v1';

export const VAZIO = {
  idioma: 'Inglês', audio: null, nivel: null, objetivo: null, bloqueio: null,
  hoje: null, prazo: null, horario: null, min: null, temas: [],
  // `fala` é o que a Web Speech API ouviu no teste de fala — fica só aqui, não
  // vai pro banco: é uma frase solta de diagnóstico, e guardar áudio/transcrição
  // de quem ainda nem tem conta não se justifica.
  tom: 'agressivo', fala: null, mem: null, feito: false,
};

const Ctx = createContext(null);

export function Provider({ children }) {
  const [a, setA] = useState(VAZIO);
  // `pronto` evita o flash de conteúdo padrão antes de ler o storage, e evita
  // divergência de hidratação: o servidor não tem localStorage.
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      const cru = localStorage.getItem(CHAVE);
      if (cru) setA({ ...VAZIO, ...JSON.parse(cru) });
    } catch {
      // storage bloqueado (aba anônima, cookies off) — segue com o padrão
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch {}
  }, [a, pronto]);

  const set = (k, v) => setA(prev => ({ ...prev, [k]: v }));
  const patch = obj => setA(prev => ({ ...prev, ...obj }));
  const reset = () => {
    setA(VAZIO);
    try { localStorage.removeItem(CHAVE); } catch {}
  };

  return <Ctx.Provider value={{ a, set, patch, reset, pronto }}>{children}</Ctx.Provider>;
}

export function useEstado() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEstado precisa estar dentro do Provider');
  return v;
}

/* ---- memórias ---------------------------------------------------------- */

/* Semeada com o que o onboarding já respondeu: o valor da tela é a pessoa
   reconhecer as próprias respostas ali e poder corrigir. Roda uma vez — depois
   disso a lista é do usuário, inclusive se ele apagar tudo. */
export function semearMemorias(a) {
  const out = [];
  if (a.objetivo) out.push({ g: 'Objetivo', t: `meu objetivo é ${String(a.objetivo).toLowerCase()}` });
  if (a.bloqueio) out.push({ g: 'O que me trava', t: `o que mais me trava é ${String(a.bloqueio).toLowerCase()}` });
  (a.temas || []).slice(0, 2).forEach(x =>
    out.push({ g: 'Assuntos', t: `gosto de falar sobre ${String(x).toLowerCase()}` }));
  out.push({ g: 'Trabalho & carreira', t: 'minha reunião semanal é em inglês, nas terças' });
  out.push({ g: 'Trabalho & carreira', t: 'minha chefe é americana e fala rápido' });
  return out;
}

export function memorias(a) {
  return a.mem === null ? semearMemorias(a) : a.mem;
}

/* Agrupa preservando a ordem em que os grupos aparecem, e devolve o índice
   original de cada item — é ele que os botões de editar/apagar usam. */
export function agrupar(itens) {
  const grupos = [];
  itens.forEach((m, i) => {
    let g = grupos.find(x => x.nome === (m.g || 'Outras'));
    if (!g) { g = { nome: m.g || 'Outras', itens: [] }; grupos.push(g); }
    g.itens.push({ ...m, i });
  });
  return grupos;
}
