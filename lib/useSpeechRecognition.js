'use client';

import { useEffect, useRef, useState } from 'react';

// Hook novo pra código v2 — reusado por PracticeSession (Etapa 4) e pelo
// roleplay (Etapa 8). CadenceApp.js (app antigo) já tem sua própria
// instância inline do mesmo padrão; não foi tocado aqui pra não arriscar
// nada do fluxo em produção.
export function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);

  useEffect(() => {
    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    const rec = new SpeechCtor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = () => {
      setRecording(false);
      setError('Não consegui ouvir seu áudio. Tente de novo.');
    };
    rec.onend = () => setRecording(false);

    recRef.current = rec;
    setSupported(true);

    return () => {
      try { rec.stop(); } catch { /* já parado */ }
    };
  }, [lang]);

  const toggle = () => {
    if (!recRef.current) return;
    if (recording) {
      recRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      setTranscript('');
      setError('');
      recRef.current.start();
      setRecording(true);
    } catch {
      setError('Não consegui abrir o microfone.');
    }
  };

  const reset = () => setTranscript('');

  return { supported, recording, transcript, error, toggle, reset, setTranscript };
}
