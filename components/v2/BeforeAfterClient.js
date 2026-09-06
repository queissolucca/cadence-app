'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeechRecognition } from '../../lib/useSpeechRecognition';
import { CadenceLogo } from './CadenceLogo';

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnnotatedText({ segments, mode }) {
  // mode 'then' risca em vermelho os trechos com erro; 'now' destaca em
  // verde os trechos aprendidos. Um único segmento sem flag = sem anotação
  // (fallback quando a IA não conseguiu reconstruir o texto original).
  return (
    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
      {(segments || []).map((s, i) => {
        if (!s.flag) return <span key={i}>{s.text}</span>;
        if (mode === 'then') {
          return <span key={i} style={{ color: 'var(--red)', textDecoration: 'line-through' }}>{s.text}</span>;
        }
        return <span key={i} style={{ color: 'var(--green)', fontWeight: 700 }}>{s.text}</span>;
      })}
    </p>
  );
}

function ResultView({ check, thenDate, locked, nextDateLabel, onRespondAgain }) {
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const shareRef = useRef(null);

  const { analysis } = check;

  const share = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    setShareError('');
    try {
      const { toPng } = await import('html-to-image');
      // Fundo fixo (= --bg claro) de propósito: a imagem compartilhada deve
      // ter a mesma cara sempre, independente do tema atual de quem gerou.
      const dataUrl = await toPng(shareRef.current, { backgroundColor: '#F8F8F1', pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'cadence-evolucao.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha evolução no Cadence' });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'cadence-evolucao.png';
        link.click();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('share image failed:', err);
        setShareError('Não consegui gerar a imagem agora. Tenta de novo.');
      }
    }
    setSharing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div ref={shareRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg)', padding: 4 }}>
        <div className="v2-card">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Dia 1 {thenDate ? `· ${formatDate(thenDate)}` : ''}
          </span>
          <div style={{ marginTop: 8 }}>
            <AnnotatedText segments={analysis.then_segments} mode="then" />
          </div>
        </div>

        <div className="v2-card-dark">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Hoje · {formatDate(check.created_at)}
          </span>
          <div style={{ marginTop: 8 }}>
            <AnnotatedText segments={analysis.now_segments} mode="now" />
          </div>
        </div>

        {analysis.wins?.length > 0 && (
          <div style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 16 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--green-dark)' }}>
              Olha o que você não sabia — e agora domina.
            </p>
            <p style={{ margin: '8px 0 10px', fontSize: 13.5, color: 'var(--ink)' }}>
              Com o cadence, esta resposta ficou mais natural em {analysis.wins.length} {analysis.wins.length === 1 ? 'ponto' : 'pontos'} que você errava:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {analysis.wins.map((w, i) => (
                <p key={i} style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>✓ {w.pt}</p>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--green-dark)' }}>
              Continue no ritmo e sinta a evolução — próxima comparação em 4 semanas.
            </p>
          </div>
        )}

        {analysis.message_pt && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center' }}>{analysis.message_pt}</p>
        )}

        <p style={{ margin: '4px 0 0', textAlign: 'center', color: 'var(--ink-soft)' }}><CadenceLogo word={17} variant="inherit" /></p>
      </div>

      <button type="button" onClick={share} disabled={sharing} className="v2-card-dark" style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {sharing ? 'Gerando imagem…' : 'Compartilhar minha evolução'}
      </button>
      {shareError && <p style={{ margin: 0, color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{shareError}</p>}

      {locked ? (
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)' }}>Próxima comparação em {nextDateLabel}</p>
      ) : (
        onRespondAgain && (
          <button type="button" onClick={onRespondAgain} className="v2-card" style={{ border: '1px solid var(--line)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--ink)' }}>
            Responder de novo
          </button>
        )
      )}

      <button type="button" onClick={() => router.push('/v2/progresso')} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
        Voltar ao Progresso
      </button>
    </div>
  );
}

function AnswerForm({ question, accent, onDone }) {
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const speech = useSpeechRecognition({ lang });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const answerText = speech.transcript || draft;

  const submit = async () => {
    const text = answerText.trim();
    if (!text) {
      setError('Escreva ou fale sua resposta primeiro.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/before-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      onDone(data.check);
    } catch {
      setError('Não consegui comparar agora — sua resposta não foi perdida, tenta enviar de novo.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="v2-card">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>a pergunta original</span>
        <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700 }}>{question}</p>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="escreva em inglês…"
        style={{ width: '100%', minHeight: 130, border: '1.5px solid var(--ink)', borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', background: 'var(--v2-card-bg)', color: 'var(--v2-card-fg)' }}
      />

      {speech.supported && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => { speech.toggle(); if (speech.transcript) setDraft(speech.transcript); }}
            aria-label="Ditar por voz"
            style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: speech.recording ? 'var(--red)' : 'var(--green)' }}
          >
            <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: '#fff' }} />
          </button>
        </div>
      )}
      {speech.transcript && draft !== speech.transcript && (
        <button type="button" onClick={() => setDraft(speech.transcript)} style={{ fontSize: 12, color: 'var(--green-dark)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
          usar: &quot;{speech.transcript}&quot;
        </button>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}

      <button type="button" onClick={submit} disabled={loading || !answerText.trim()} className="v2-card-dark" style={{ border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {loading ? 'Comparando…' : 'Enviar resposta'}
      </button>
    </div>
  );
}

export function BeforeAfterClient({ initialCheck, thenDate, locked, nextDateLabel, question, accent, canRespond }) {
  const [check, setCheck] = useState(initialCheck);
  const [answering, setAnswering] = useState(!initialCheck && canRespond);

  if (answering) {
    return <AnswerForm question={question} accent={accent} onDone={(c) => { setCheck(c); setAnswering(false); }} />;
  }

  if (!check) {
    return (
      <div className="v2-card">
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>Nenhuma comparação disponível ainda.</p>
      </div>
    );
  }

  return (
    <ResultView
      check={check}
      thenDate={thenDate}
      locked={locked}
      nextDateLabel={nextDateLabel}
      onRespondAgain={canRespond ? () => setAnswering(true) : null}
    />
  );
}
