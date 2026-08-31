'use client';

import { useState } from 'react';
import { BackHeader } from '../../../../components/v2/BackHeader';

function Star({ filled, onClick, onEnter, onLeave }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label="estrela"
      style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 0 }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill={filled ? '#E0A63C' : 'none'} stroke={filled ? '#E0A63C' : 'var(--ink-soft)'} strokeWidth="1.6" strokeLinejoin="round">
        <path d="M12 2l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.4 9l6.7-.9L12 2z" />
      </svg>
    </button>
  );
}

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const canSend = rating > 0 || message.trim().length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating || undefined, message: message.trim() }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('sent');
      setMessage('');
      setRating(0);
    } catch {
      setStatus('error');
    }
  };

  const shown = hover || rating;

  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <BackHeader title="Enviar feedback" />
        {status === 'sent' ? (
          <div className="v2-card">
            <p style={{ margin: 0, fontSize: 14 }}>Recebemos — obrigado! Lemos tudo que chega aqui. 🙌</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avaliação por estrelas */}
            <div className="v2-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--v2-card-fg)' }}>Como você avalia o app?</span>
              <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    filled={n <= shown}
                    onClick={() => setRating(n === rating ? 0 : n)}
                    onEnter={() => setHover(n)}
                    onLeave={() => {}}
                  />
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', minHeight: 16 }}>
                {shown ? `${shown} de 5` : 'toque nas estrelas (opcional)'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
                Quer contar algo? Bug, ideia, reclamação — opcional. Você pode enviar só as estrelas.
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="o que você quer nos contar? (opcional)"
                style={{ minHeight: 120, border: '1.5px solid var(--ink)', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)' }}
              />
            </div>

            {status === 'error' && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>Não consegui enviar agora. Tenta de novo.</p>}
            <button
              type="submit"
              disabled={status === 'sending' || !canSend}
              className="v2-card-dark"
              style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: canSend ? 'pointer' : 'default', opacity: canSend ? 1 : 0.6 }}
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
