'use client';

import { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';

const reais = (v) => (typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '');
const data = (iso) => {
  if (!iso) return null;
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
};
const NOME = { cartao: 'Cartão de crédito', pix_automatico: 'Pix Automático', outro: 'Assinatura mensal' };

/* VER E CANCELAR A ASSINATURA, SEM FALAR COM NINGUÉM.

   Cobrança recorrente sem um botão de cancelar à vista é o tipo de coisa que
   vira reclamação (e chargeback, que o Asaas cobra). O cancelamento aqui é de
   verdade: remove a assinatura do cartão e/ou a autorização do Pix no Asaas
   (DELETE /api/assinatura). O que a pessoa já pagou continua valendo até o
   fim — a tela diz até quando, pra ninguém achar que perdeu o mês.

   Lê na hora de abrir, do Asaas, e não de uma prop do servidor: a assinatura
   pode ter sido cancelada pelo app do banco (Pix Automático) minutos antes. */
export function AssinaturaSheet({ open, onClose }) {
  const [estado, setEstado] = useState('carregando'); // carregando | pronto | erro
  const [info, setInfo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let vivo = true;
    setEstado('carregando'); setConfirmando(false); setMsg('');
    fetch('/api/assinatura', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (vivo) { setInfo(d); setEstado('pronto'); } })
      .catch(() => { if (vivo) setEstado('erro'); });
    return () => { vivo = false; };
  }, [open]);

  const cancelar = async () => {
    setCancelando(true);
    setMsg('');
    try {
      const r = await fetch('/api/assinatura', { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error();
      const ate = data(d.acessoAte);
      setInfo((prev) => ({ ...(prev || {}), assinaturas: [], acessoAte: d.acessoAte }));
      setMsg(d.falhou
        ? 'Cancelei parte, mas algo falhou. Manda um feedback que a gente resolve na mão.'
        : `Assinatura cancelada. Nada mais será cobrado${ate ? ` — seu acesso continua até ${ate}` : ''}.`);
      setConfirmando(false);
    } catch {
      setMsg('Não consegui cancelar agora. Tenta de novo em instantes.');
    }
    setCancelando(false);
  };

  const itens = info?.assinaturas || [];
  const ate = data(info?.acessoAte);

  return (
    <BottomSheet open={open} onClose={onClose} title="Assinatura">
      {estado === 'carregando' && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>Buscando sua assinatura…</p>}
      {estado === 'erro' && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>Não consegui buscar agora. Tenta de novo em instantes.</p>}

      {estado === 'pronto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itens.length === 0 && (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--v2-card-fg)' }}>
              Você não tem nenhuma cobrança mensal ativa.
              {ate && <><br /><span style={{ color: 'var(--ink-soft)' }}>Seu acesso Pro vale até {ate}.</span></>}
            </p>
          )}

          {itens.map((it, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid var(--line)' }}>
              <strong style={{ display: 'block', fontSize: 14.5, color: 'var(--v2-card-fg)' }}>
                Pro mensal · {reais(it.valor)}
              </strong>
              <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                {NOME[it.tipo] || NOME.outro}
                {data(it.proximaCobranca) ? ` · próxima cobrança em ${data(it.proximaCobranca)}` : ''}
              </span>
            </div>
          ))}

          {itens.length > 0 && !confirmando && (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              style={{ marginTop: 4, padding: '12px', borderRadius: 12, border: '1px solid var(--line)', background: 'none', color: 'var(--v2-card-fg)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar assinatura
            </button>
          )}

          {confirmando && (
            <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--green-soft)' }}>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--v2-card-fg)' }}>
                Nada mais será cobrado. {ate ? `Você continua com o Pro até ${ate}.` : 'O que você já pagou continua valendo até o fim do período.'}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={cancelando}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#b0574a', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: cancelando ? 0.6 : 1 }}
                >
                  {cancelando ? 'Cancelando…' : 'Sim, cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={cancelando}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--line)', background: 'none', color: 'var(--v2-card-fg)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  Manter
                </button>
              </div>
            </div>
          )}

          {msg && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>{msg}</p>}
        </div>
      )}
    </BottomSheet>
  );
}
