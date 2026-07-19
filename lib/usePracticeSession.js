'use client';

import { useRef, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

// Máquina de estado da sessão de prática (fila, avaliação, feedback
// inline/adiado, conclusão) — extraída de components/v2/PracticeSession.js
// pra ser consumida por um único componente responsivo (mobile empilhado /
// desktop em duas colunas), em vez de duas cópias da mesma lógica.
export function usePracticeSession({ mode, initialQueue, profile, sessionKind = 'daily' }) {
  const accent = profile?.voice_accent || 'us';
  const rate = profile?.audio_speed || 1.0;
  const lang = accent === 'uk' ? 'en-GB' : 'en-US';
  const speech = useSpeechRecognition({ lang });

  const [queueIndex, setQueueIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showModel, setShowModel] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [finished, setFinished] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);

  const statsRef = useRef({ correct: 0, total: 0, newPhrases: [], startedAt: Date.now() });
  const deferredResultsRef = useRef([]);
  const [deferredIndex, setDeferredIndex] = useState(null);
  const [deferredTotal, setDeferredTotal] = useState(0);

  const queue = initialQueue || [];
  const totalItems = queue.length;
  const activeItem = deferredIndex !== null ? null : queue[queueIndex];
  const timingEnd = profile?.correction_timing === 'end_of_exercise' || profile?.correction_timing === 'end';

  const itemMode = activeItem?.mode || mode;
  const isSpeaking = itemMode === 'speaking';

  const answerText = isSpeaking ? speech.transcript || draft : draft;

  const resetInputs = () => {
    setDraft('');
    speech.reset();
    setError('');
    setResult(null);
    setShowModel(false);
    setShowHint(false);
  };

  const finishSession = async (extraDurationSeconds = 0) => {
    const stats = statsRef.current;
    const durationSeconds = Math.round((Date.now() - stats.startedAt) / 1000) + extraDurationSeconds;
    try {
      const res = await fetch('/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: sessionKind, mode, duration_seconds: durationSeconds, items_total: stats.total, items_correct: stats.correct }),
      });
      const data = await res.json();
      setSessionSummary({ ...data, correct: stats.correct, total: stats.total, newPhrases: stats.newPhrases });
    } catch {
      setSessionSummary({ streak_count: null, week_days_done: null, weekly_goal: null, shield_earned: false, correct: stats.correct, total: stats.total, newPhrases: stats.newPhrases });
    }
    setFinished(true);
  };

  const showDeferredResult = (idx) => {
    const item = deferredResultsRef.current[idx];
    if (!item) {
      finishSession();
      return;
    }
    setResult(item);
    setDeferredIndex(idx);
  };

  const advance = () => {
    resetInputs();

    if (deferredIndex !== null) {
      const nextIdx = deferredIndex + 1;
      if (nextIdx < deferredResultsRef.current.length) {
        showDeferredResult(nextIdx);
      } else {
        finishSession();
      }
      return;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex < totalItems) {
      setQueueIndex(nextIndex);
      return;
    }

    if (timingEnd && deferredResultsRef.current.length > 0) {
      setDeferredTotal(deferredResultsRef.current.length);
      showDeferredResult(0);
      return;
    }

    finishSession();
  };

  const submitAnswer = async () => {
    const text = answerText.trim();
    if (!text) {
      setError(isSpeaking ? 'Fale ou digite sua resposta primeiro.' : 'Escreva sua resposta primeiro.');
      return;
    }
    if (!activeItem) return;

    setLoading(true);
    setError('');

    const payload = {
      mode: itemMode,
      prompt_pt: activeItem.promptPt,
      expected_focus: activeItem.expectedFocus,
      user_answer: text,
      phrase_id: activeItem.kind === 'review' ? activeItem.phraseId : null,
      skill_tags: activeItem.skillTags || [],
    };

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'evaluation_failed');

      const stats = statsRef.current;
      stats.total += 1;
      if (data.evaluation.result === 'correct') stats.correct += 1;
      if ((activeItem.kind === 'new' || activeItem.kind === 'weak') && data.reviewItem) {
        stats.newPhrases.push(data.reviewItem.content?.forma_natural || data.reviewItem.pattern);
      }

      const resultPayload = { ...data.evaluation, original: text };

      if (timingEnd) {
        deferredResultsRef.current = [...deferredResultsRef.current, resultPayload];
        advance();
      } else {
        setResult(resultPayload);
      }
    } catch {
      setError('Não consegui corrigir agora — sua resposta não foi perdida, tente de novo.');
    }
    setLoading(false);
  };

  const useModelPhrase = async () => {
    if (activeItem?.kind === 'review') {
      try {
        await fetch('/api/review/defer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase_id: activeItem.phraseId }),
        });
      } catch {
        // segue mesmo se falhar — não é uma tentativa real, não crítico
      }
    }
    advance();
  };

  const item = activeItem || queue[queueIndex];
  const progressCurrent = deferredIndex !== null ? deferredIndex + 1 : queueIndex + 1;
  const progressTotal = deferredIndex !== null ? deferredTotal : totalItems;

  return {
    accent, rate, speech, isSpeaking, answerText, draft, setDraft,
    loading, error, result, showModel, setShowModel, showHint, setShowHint,
    finished, sessionSummary, item, activeItem, progressCurrent, progressTotal,
    submitAnswer, advance, useModelPhrase, finishSession,
  };
}
