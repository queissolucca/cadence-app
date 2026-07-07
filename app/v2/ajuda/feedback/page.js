'use client';

import { useState } from 'react';
import { BackHeader } from '../../../../components/v2/BackHeader';

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <BackHeader title="Enviar feedback" />
        {status === 'sent' ? (
          <div className="v2-card">
            <p style={{ margin: 0, fontSize: 14 }}>Recebemos — obrigado por escrever. Lemos tudo que chega aqui.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
              Bug, ideia, reclamação — qualquer coisa. Sem formulário longo, só escreve.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="o que você quer nos contar?"
              style={{ minHeight: 140, border: '1.5px solid var(--ink)', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)' }}
            />
            {status === 'error' && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>Não consegui enviar agora. Tenta de novo.</p>}
            <button
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              className="v2-card-dark"
              style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
