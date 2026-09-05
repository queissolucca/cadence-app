'use client';

import { useState } from 'react';

// Botão que cria o checkout no servidor e redireciona pra página hospedada do
// AbacatePay. Nunca manda preço nem id de produto — só o planId.
export function CheckoutButton({ planId, label = 'assinar com cartão ou pix', style }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setErr('Não consegui abrir o pagamento agora. Tenta de novo.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr('Sem conexão. Tenta de novo.');
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        style={{ ...(style || {}), opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer' }}
      >
        {loading ? 'Abrindo pagamento…' : label}
      </button>
      {err && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#c0392b', textAlign: 'center' }}>{err}</p>}
    </>
  );
}
