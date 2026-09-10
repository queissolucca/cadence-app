'use client';

import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_BY_LABEL, CATEGORY_LABELS } from '../memoryCategories';
import { memorias as memoriasLocais } from './state';

/* A folha de memórias tem dois modos, e o componente não sabe em qual está.

   Com sessão, fala com /api/memory — a mesma tabela user_memory que a Cady lê
   pra personalizar a conversa em /v2. Sem sessão, cai no localStorage.

   Não é fallback por precaução: é o fluxo mesmo. As 28 primeiras telas rodam
   com a pessoa anônima, e só depois do paywall existe conta. Na prática ninguém
   edita memória antes disso (a aba Você só aparece depois da conta), mas o modo
   dev pula pra qualquer tela, e a folha não pode explodir ali.

   Quem manda, quando existe sessão, é sempre o servidor: as memórias semeadas
   pelo /api/onboarding já estão lá, e reconciliar duas listas divergentes daria
   duplicata na cara da pessoa. */

const paraItem = (m) => ({
  k: `r${m.id}`,
  id: m.id,
  g: CATEGORY_LABELS[m.category] || CATEGORY_LABELS.other,
  t: m.fact,
});

const categoriaDe = (g) => CATEGORY_BY_LABEL[g] || 'other';

export function useMemorias(a, set) {
  // null = não há sessão (ou a busca falhou) → modo local
  const [remotas, setRemotas] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetch('/api/memory')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && Array.isArray(d?.memories)) setRemotas(d.memories.map(paraItem));
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const remoto = remotas !== null;
  const locais = memoriasLocais(a);
  const itens = remoto ? remotas : locais.map((m, i) => ({ ...m, k: `l${i}`, i }));

  const adicionar = useCallback(async (texto) => {
    if (!remoto) {
      set('mem', [...locais, { g: 'Suas anotações', t: texto }]);
      return;
    }
    // Otimista com item provisório: a folha responde na hora e a linha é
    // trocada pela do servidor (que traz o id de verdade) quando ela volta.
    const prov = { k: `p${Date.now()}`, id: null, g: CATEGORY_LABELS.other, t: texto };
    setRemotas((L) => [prov, ...L]);
    try {
      const r = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: texto, category: 'other' }),
      });
      const d = r.ok ? await r.json() : null;
      setRemotas((L) => (d?.memory
        ? L.map((m) => (m.k === prov.k ? paraItem(d.memory) : m))
        : L.filter((m) => m.k !== prov.k)));
    } catch {
      setRemotas((L) => L.filter((m) => m.k !== prov.k));
    }
  }, [remoto, locais, set]);

  const editar = useCallback(async (item, texto) => {
    if (!remoto) {
      set('mem', locais.map((m, k) => (k === item.i ? { ...m, t: texto } : m)));
      return;
    }
    const antes = item.t;
    setRemotas((L) => L.map((m) => (m.k === item.k ? { ...m, t: texto } : m)));
    try {
      const r = await fetch(`/api/memory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: texto, category: categoriaDe(item.g) }),
      });
      if (!r.ok) throw new Error('patch');
    } catch {
      setRemotas((L) => L.map((m) => (m.k === item.k ? { ...m, t: antes } : m)));
    }
  }, [remoto, locais, set]);

  const apagar = useCallback(async (item) => {
    if (!remoto) {
      set('mem', locais.filter((_, k) => k !== item.i));
      return;
    }
    const antes = remotas;
    setRemotas((L) => L.filter((m) => m.k !== item.k));
    try {
      const r = await fetch(`/api/memory/${item.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('delete');
    } catch {
      setRemotas(antes);
    }
  }, [remoto, locais, remotas, set]);

  return { itens, adicionar, editar, apagar, carregando, remoto };
}
