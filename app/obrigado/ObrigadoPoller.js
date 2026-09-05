'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../components/ui';

// Faz polling de /api/checkout/status até o webhook liberar o acesso. Enquanto
// não confirma, deixa claro que o pagamento está sendo processado (não afirma
// que já liberou). Também oferece "ir pro app" — o middleware é quem libera.
export function ObrigadoPoller() {
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let stopped = false;
    let n = 0;
    const tick = async () => {
      try {
        const r = await fetch('/api/checkout/status', { cache: 'no-store' });
        const d = await r.json();
        if (!stopped && d.active) { setActive(true); setChecking(false); return; }
      } catch { /* tenta de novo */ }
      n += 1;
      if (!stopped) {
        if (n >= 20) { setChecking(false); return; } // ~1 min de polling
        setTimeout(tick, 3000);
      }
    };
    tick();
    return () => { stopped = true; };
  }, []);

  const btn = {
    display: 'block', textAlign: 'center', textDecoration: 'none', border: 'none',
    borderRadius: 12, padding: '13px 16px', fontWeight: 800, fontSize: 15,
    background: 'var(--green)', color: '#fff', marginTop: 16,
  };

  if (active) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <p style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Pagamento confirmado!</p>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>Seu acesso foi liberado. Bora destravar seu inglês.</p>
          <a href="/v2" style={btn}>Entrar no Cadence →</a>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>⏳</div>
        <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Estamos confirmando seu pagamento…</p>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          {checking
            ? 'Isso pode levar até um minutinho. Pode deixar esta tela aberta.'
            : 'Se você já pagou, a confirmação chega em instantes. Você pode ir pro app — assim que confirmar, seu acesso abre.'}
        </p>
        <a href="/v2" style={{ ...btn, background: 'none', border: '1px solid var(--line)', color: 'var(--ink)' }}>Ir para o app</a>
      </div>
    </Card>
  );
}
