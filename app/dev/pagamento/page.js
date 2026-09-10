'use client';

import { useState } from 'react';
import { PagamentoTela } from '../../pagamento/PagamentoTela';

// Os dois estados da tela real: quem nunca pagou e quem deixou o acesso vencer.
export default function PreviaPagamento() {
  const [expirado, setExpirado] = useState(false);
  return (
    <>
      <PagamentoTela email="voce@exemplo.com" minutos={10} expirado={expirado} />
      <button
        onClick={() => setExpirado(v => !v)}
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 99, fontSize: 11,
          padding: '7px 11px', borderRadius: 9, background: '#1e1e1b',
          color: '#f2f2ea', border: '1px solid #3d363d', fontFamily: 'monospace',
        }}
      >
        {expirado ? 'ver: nunca pagou' : 'ver: acesso vencido'}
      </button>
    </>
  );
}
