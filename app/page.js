'use client';

import { useEffect, useMemo, useState } from 'react';

const WRITE_SCENARIOS = [
  {
    label: 'EMAIL DE TRABALHO',
    context: 'Seu gerente perguntou se o relatório fica pronto hoje.',
    askPt: 'Responda dizendo que você envia amanhã de manhã.',
    natural: "I'll send you the report by tomorrow morning.",
    why: 'Use “by” para marcar o prazo final.',
  },
  {
    label: 'MENSAGEM A UM COLEGA',
    context: 'Você vai se atrasar para a reunião.',
    askPt: 'Avise que chega 10 minutos atrasado e peça para começarem sem você.',
    natural: "I'm running about 10 minutes late — please start without me.",
    why: '“I’m running late” é a forma natural de dizer que você está atrasado.',
  },
  {
    label: 'EMAIL PARA O HOTEL',
    context: 'Você chega antes do horário de check-in.',
    askPt: 'Pergunte educadamente se dá para fazer o check-in mais cedo.',
    natural: 'Would it be possible to check in a little earlier than usual?',
    why: '“Would it be possible to…?” soa educado e profissional.',
  },
];

const SPEAK_SCENARIOS = [
  {
    label: 'RESTAURANTE',
    context: 'Você terminou de comer e quer ir embora.',
    askPt: 'Peça a conta com educação.',
    natural: 'Could we get the bill, please?',
    why: '“Could we get…?” é o pedido educado.',
  },
  {
    label: 'AEROPORTO',
    context: 'Você está perdido no terminal.',
    askPt: 'Pergunte a alguém onde fica o portão 22.',
    natural: 'Excuse me, do you know where gate 22 is?',
    why: 'Comece com “Excuse me” para chamar atenção com educação.',
  },
  {
    label: 'REUNIÃO',
    context: 'Você discorda de uma ideia que acabaram de propor.',
    askPt: 'Discorde de forma educada e diga o porquê.',
    natural: "I see your point, but I'm not sure that would work because...",
    why: 'Reconheça o outro lado antes de discordar.',
  },
];

const SCHEDULE = [1, 7, 30];
const STORAGE_KEY = 'cadence-progress-v2';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseStored() {
  if (typeof window === 'undefined') return { streak: 1, items: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streak: 1, items: [] };
    const parsed = JSON.parse(raw);
    return {
      streak: parsed.streak || 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      lastSeen: parsed.lastSeen || '',
    };
  } catch {
    return { streak: 1, items: [] };
  }
}

function scheduleItem(item, passed) {
  let stage = passed ? (item.stage || 0) + 1 : 0;
  let mastered = false;
  let due = Date.now() + 86400000;

  if (stage >= SCHEDULE.length) {
    mastered = true;
    stage = SCHEDULE.length;
    due = Date.now() + 365 * 86400000;
  } else {
    due = Date.now() + SCHEDULE[stage] * 86400000;
  }

  return {
    ...item,
    stage,
    mastered,
    due,
    lastResult: passed ? 'ok' : 'fail',
  };
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
}

function similarity(a, b) {
  const wa = new Set(normalizeText(a).split(' '));
  const wb = new Set(normalizeText(b).split(' '));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  wa.forEach((word) => { if (wb.has(word)) inter += 1; });
  return inter / Math.max(wa.size, wb.size);
}

function localCorrect(scenario, text) {
  const genericMistakes = [
    { re: /\bcan i\b/i, why: '“Can I…?” soa informal; prefira “Would it be possible…?”.' },
    { re: /\bI want\b/i, why: '“I want…” pode soar rude em um pedido; use “Could we get…” ou “Could you…?”.' },
    { re: /\buntil\b/i, why: 'Use “by” para marcar o prazo final em vez de “until”.' },
  ];

  for (const m of genericMistakes) {
    if (m.re.test(text)) {
      return {
        verdict: 'minor',
        natural: scenario.natural,
        why: m.why,
        tip: 'Tente mudar essa frase para uma forma mais natural e educada.',
        learningPoint: 'Evite construções muito literais ou diretas.',
      };
    }
  }

  const scenarioRules = {
    'EMAIL DE TRABALHO': [
      {
        re: /\bcan i send\b/i,
        why: 'Para dizer que você envia amanhã, use “I’ll send” ou “I will send”.',
        tip: 'Use futuro simples para compromissos futuros.',
      },
      {
        re: /\buntil tomorrow\b/i,
        why: '“Until tomorrow” não passa a ideia de prazo. Use “by tomorrow morning”.',
        tip: '“By” marca o prazo exato de entrega.',
      },
      {
        re: /\bwill send tomorrow\b/i,
        why: 'Para a versão natural, diga “I’ll send you the report by tomorrow morning.”',
        tip: 'Use “by tomorrow morning” para dar um prazo claro.',
      },
    ],
    'MENSAGEM A UM COLEGA': [
      {
        re: /\bi will be late\b/i,
        why: 'Para avisar que você se atrasará, “I’m running about 10 minutes late” soa mais natural.',
        tip: 'Use expressões idiomáticas para atrasos.',
      },
      {
        re: /\bplease start without me\b/i,
        why: 'Essa frase está correta; ela pode ser mantida como alternativa natural.',
        tip: 'Essa estrutura já é boa para contexto informal.',
      },
      {
        re: /\bi am late\b/i,
        why: '“I’m running about 10 minutes late” é mais natural que “I am late.”',
        tip: 'Use frases com “running late” para atrasos.',
      },
    ],
    'EMAIL PARA O HOTEL': [
      {
        re: /\bcan i check in earlier\b/i,
        why: 'Para pedir educadamente, prefira “Would it be possible to check in a little earlier?”.',
        tip: 'Use perguntas indiretas em emails formais.',
      },
      {
        re: /\bis it possible\b/i,
        why: '“Is it possible…” é aceitável, mas “Would it be possible…” é mais educado.',
        tip: 'Use formas condicionais para pedidos educados.',
      },
      {
        re: /\bearly check in\b/i,
        why: '“Early check-in” é entendido, mas prefira a forma completa com “Would it be possible to check in…”.',
        tip: 'Apresente o pedido de forma completa e educada.',
      },
    ],
    RESTAURANTE: [
      {
        re: /\bi want the bill\b/i,
        why: '“I want the bill” soa rude; prefira “Could we get the bill, please?”.',
        tip: 'Use pedidos mais suaves em restaurantes.',
      },
      {
        re: /\bcheck please\b/i,
        why: '“Check, please” é aceito, mas “Could we get the bill, please?” soa mais educado.',
        tip: 'Use “Could we get…” para pedidos em serviço.',
      },
      {
        re: /\bi would like the bill\b/i,
        why: '“Could we get the bill, please?” soa mais natural do que “I would like the bill.”',
        tip: 'Use pedidos com “Could we get…” para tom mais leve.',
      },
    ],
    AEROPORTO: [
      {
        re: /\bwhere is gate\b/i,
        why: 'A estrutura está boa; use “Excuse me, do you know where gate 22 is?”.',
        tip: 'Adicione “Excuse me” para iniciar a pergunta educadamente.',
      },
      {
        re: /\bhow do i get to gate\b/i,
        why: '“Do you know where gate 22 is?” é mais natural para pedir direção rapidamente.',
        tip: 'Mantenha a frase curta e direta.',
      },
      {
        re: /\bwhere can i find gate\b/i,
        why: '“Excuse me, do you know where gate 22 is?” soa mais natural que “Where can I find gate 22?”.',
        tip: 'Use perguntas diretas começando com “Excuse me”.',
      },
    ],
    REUNIÃO: [
      {
        re: /\bi disagree\b/i,
        why: '“I disagree” funciona, mas para ser mais colaborativo, comece com “I see your point, but…”.',
        tip: 'Reconheça o outro lado antes de discordar.',
      },
      {
        re: /\bthat won t work\b/i,
        why: 'Dizer “I’m not sure that would work” soa menos agressivo do que “That won’t work”.',
        tip: 'Use linguagem mais suave para discordar em reunião.',
      },
      {
        re: /\bi don t think it will work\b/i,
        why: '“I’m not sure that would work” soa mais natural e colaborativo.',
        tip: 'Use “I’m not sure that…” para suavizar a discordância.',
      },
    ],
  };

  const rules = scenarioRules[scenario.label] || [];
  for (const rule of rules) {
    if (rule.re.test(text)) {
      return {
        verdict: 'minor',
        natural: scenario.natural,
        why: rule.why,
        tip: rule.tip || 'Compare com a versão natural e ajuste conforme o cenário.',
        learningPoint: 'Ajuste a resposta usando o padrão do cenário.',
      };
    }
  }

  const sim = similarity(text, scenario.natural);
  if (sim >= 0.75) {
    return {
      verdict: 'good',
      natural: scenario.natural,
      why: 'Sua frase está muito próxima do padrão natural do cenário.',
      tip: '',
      learningPoint: 'Mantenha essa construção natural e clara.',
    };
  }
  if (sim >= 0.4) {
    return {
      verdict: 'minor',
      natural: scenario.natural,
      why: `A estrutura está no caminho certo para o cenário “${scenario.label}”. Ajuste o vocabulário para ficar mais natural.`,
      tip: 'Use a versão natural como modelo e copie a ordem das palavras.',
      learningPoint: 'Foque na escolha de palavras mais naturais para o contexto.',
    };
  }

  return {
    verdict: 'rework',
    natural: scenario.natural,
    why: `Sua resposta não corresponde ao cenário “${scenario.label}” e precisa ser reescrita completamente.`,
    tip: 'Foque na intenção do pedido e use a versão natural como modelo direto.',
    learningPoint: 'Reescreva usando a forma mais natural do exemplo; respostas fora do contexto são consideradas erro grave.',
  };
}

function normalizeResult(raw, scenario) {
  if (!raw || typeof raw !== 'object' || !raw.verdict || !raw.why) {
    return null;
  }

  return {
    verdict: raw.verdict,
    natural: raw.natural || scenario.natural || '',
    why: raw.why,
    tip: raw.tip || '',
    learningPoint: raw.learningPoint || '',
  };
}

function dueLabel(item, now) {
  if (!item) return '';
  if (item.mastered) return 'dominado';
  if (typeof item.due !== 'number') return 'salva';
  if (item.due <= now) return 'revisar';
  const d = Math.ceil((item.due - now) / 86400000);
  return d <= 1 ? 'amanhã' : d < 7 ? `em ${d}d` : d < 30 ? '1 sem' : '1 mês';
}

export default function HomePage() {
  const [screen, setScreen] = useState('home');
  const [writeIdx, setWriteIdx] = useState(0);
  const [speakIdx, setSpeakIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [speakTyped, setSpeakTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(1);
  const [items, setItems] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewList, setReviewList] = useState([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const stored = parseStored();
    const today = getTodayKey();
    let nextStreak = stored.streak || 1;
    if (stored.lastSeen && stored.lastSeen !== today) {
      const diff = (new Date(today) - new Date(stored.lastSeen)) / 86400000;
      nextStreak = diff === 1 ? nextStreak + 1 : 1;
    }
    const updated = { streak: nextStreak, lastSeen: today, items: stored.items || [] };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setStreak(nextStreak);
    setItems(stored.items || []);

    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechCtor) {
      const rec = new SpeechCtor();
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        let interim = '';
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += chunk;
          } else {
            interim += chunk;
          }
        }
        setTranscript((finalText + interim).trim());
      };
      rec.onerror = () => {
        setRecording(false);
        setError('Não consegui ouvir seu áudio. Tente de novo.');
      };
      rec.onend = () => setRecording(false);
      setRecognition(rec);
      setSpeechSupported(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = parseStored();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak, lastSeen: getTodayKey(), items: stored.items || items }));
  }, [items, streak]);

  const writeScenario = useMemo(() => (reviewing ? reviewList[reviewPos] : WRITE_SCENARIOS[writeIdx]), [reviewing, reviewList, reviewPos, writeIdx]);
  const speakScenario = useMemo(() => (reviewing ? reviewList[reviewPos] : SPEAK_SCENARIOS[speakIdx]), [reviewing, reviewList, reviewPos, speakIdx]);
  const dueItems = useMemo(() => (items || []).filter((it) => !it.mastered && it.due <= Date.now()), [items]);

  const resetView = () => {
    setScreen('home');
    setError('');
    setDraft('');
    setTranscript('');
    setSpeakTyped('');
    setResult(null);
    setReviewing(false);
    setReviewList([]);
    setReviewPos(0);
    setRecording(false);
  };

  const startWrite = () => {
    setScreen('write');
    setError('');
    setDraft('');
    setResult(null);
    setReviewing(false);
  };

  const startSpeak = () => {
    setScreen('speak');
    setError('');
    setTranscript('');
    setSpeakTyped('');
    setResult(null);
    setReviewing(false);
  };

  const startReview = () => {
    const list = [...items]
      .filter((it) => !it.mastered && typeof it.due === 'number' && it.due <= Date.now())
      .sort((a, b) => a.due - b.due);
    if (!list.length) return;
    setReviewList(list);
    setReviewPos(0);
    setReviewing(true);
    setScreen(list[0].mode === 'speak' ? 'speak' : 'write');
    setError('');
    setDraft('');
    setTranscript('');
    setSpeakTyped('');
  };

  const toggleRec = () => {
    if (!recognition) {
      setError('Seu navegador não suporta reconhecimento de voz.');
      return;
    }
    if (recording) {
      recognition.stop();
      setRecording(false);
      return;
    }
    try {
      recognition.start();
      setTranscript('');
      setRecording(true);
      setError('');
    } catch {
      setError('Não consegui abrir o microfone.');
    }
  };

  const saveEntry = (entry) => {
    const nextItems = [entry, ...items].slice(0, 40);
    setItems(nextItems);
    if (typeof window !== 'undefined') {
      const stored = parseStored();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak, lastSeen: getTodayKey(), items: nextItems }));
    }
  };

  const submitAnswer = async (mode) => {
    const text = mode === 'speak' ? (transcript || speakTyped).trim() : draft.trim();
    if (!text) {
      setError(mode === 'speak' ? 'Fale ou digite sua resposta primeiro.' : 'Escreva sua resposta primeiro.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      mode,
      userText: text,
      scenario: mode === 'speak' ? speakScenario : writeScenario,
      memory: items.slice(0, 3).map((item) => ({ natural: item.natural, why: item.why })),
    };

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const normalized = normalizeResult(data, mode === 'speak' ? speakScenario : writeScenario);
      const resultData = normalized || localCorrect(mode === 'speak' ? speakScenario : writeScenario, text);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        label: (mode === 'speak' ? speakScenario : writeScenario).label,
        context: (mode === 'speak' ? speakScenario : writeScenario).context,
        askPt: (mode === 'speak' ? speakScenario : writeScenario).askPt,
        natural: resultData.natural,
        why: resultData.why,
        tip: resultData.tip,
        stage: 0,
        mastered: false,
        due: Date.now() + 86400000,
        created: Date.now(),
        lastResult: 'new',
        learningPoint: resultData.learningPoint,
      };

      const passed = resultData.verdict !== 'rework';
      const scheduled = scheduleItem(entry, passed);
      saveEntry(scheduled);
      setResult({
        ...resultData,
        original: text,
        mode,
        pass: passed,
        stage: scheduled.stage,
        mastered: scheduled.mastered,
        nextLabel: scheduled.mastered ? 'dominado' : 'amanhã',
        isReview: reviewing,
      });
      setScreen('result');
      setLoading(false);
    } catch {
      const fallback = localCorrect(mode === 'speak' ? speakScenario : writeScenario, text);
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        label: (mode === 'speak' ? speakScenario : writeScenario).label,
        context: (mode === 'speak' ? speakScenario : writeScenario).context,
        askPt: (mode === 'speak' ? speakScenario : writeScenario).askPt,
        natural: fallback.natural,
        why: fallback.why,
        tip: fallback.tip,
        stage: 0,
        mastered: false,
        due: Date.now() + 86400000,
        created: Date.now(),
        lastResult: 'new',
        learningPoint: fallback.learningPoint,
      };
      const passed = fallback.verdict !== 'rework';
      const scheduled = scheduleItem(entry, passed);
      saveEntry(scheduled);
      setResult({
        ...fallback,
        original: text,
        mode,
        pass: passed,
        stage: scheduled.stage,
        mastered: scheduled.mastered,
        nextLabel: scheduled.mastered ? 'dominado' : 'amanhã',
        isReview: reviewing,
      });
      setScreen('result');
      setLoading(false);
    }
  };

  const nextScenario = () => {
    if (reviewing) {
      const nextPos = reviewPos + 1;
      if (nextPos < reviewList.length) {
        setReviewPos(nextPos);
        setScreen(reviewList[nextPos].mode === 'speak' ? 'speak' : 'write');
        setDraft('');
        setTranscript('');
        setSpeakTyped('');
        setError('');
        return;
      }
      resetView();
      return;
    }

    if (screen === 'speak') {
      setSpeakIdx((speakIdx + 1) % SPEAK_SCENARIOS.length);
      setTranscript('');
      setSpeakTyped('');
      setError('');
      setScreen('speak');
    } else {
      setWriteIdx((writeIdx + 1) % WRITE_SCENARIOS.length);
      setDraft('');
      setError('');
      setScreen('write');
    }
  };

  const speakText = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  return (
    <main className="app-shell">
      <div className="app-card">
        {screen === 'home' && (
          <section className="screen home-screen">
            <div className="topbar">
              <div>
                <div className="logo">cadence</div>
                <p className="subtitle">inglês, pouco e sempre</p>
              </div>
              <div className="streak-pill">
                <span className="dot" />
                <strong>{streak}</strong>
                <span>dias</span>
              </div>
            </div>

            <div className="hero">
              <h1>O que vamos praticar hoje?</h1>
              <p>Correção inteligente, revisão espaçada e memória para evoluir com consistência.</p>
            </div>

            {dueItems.length > 0 && (
              <button className="review-banner" onClick={startReview}>
                <span className="review-count">{dueItems.length}</span>
                <span className="review-copy">
                  <strong>Revisar agora</strong>
                  <span>{dueItems.length === 1 ? '1 frase pronta para revisão' : `${dueItems.length} frases prontas para revisão`}</span>
                </span>
              </button>
            )}

            <div className="actions">
              <button className="action-btn primary" onClick={startWrite}>
                <span className="action-icon">W</span>
                <span>
                  <strong>Escrever</strong>
                  <small>Responda um cenário por escrito</small>
                </span>
              </button>
              <button className="action-btn secondary" onClick={startSpeak}>
                <span className="action-icon">S</span>
                <span>
                  <strong>Falar</strong>
                  <small>Pratique com voz e receba correção</small>
                </span>
              </button>
            </div>

            <div className="saved-card">
              <div className="saved-header">
                <strong>Suas frases</strong>
                <span>{items.length} na memória</span>
              </div>
              <div className="saved-list">
                {items.length === 0 ? (
                  <div className="empty-state">Cada correção vira uma frase salva aqui e volta na hora certa.</div>
                ) : items.slice(0, 6).map((item) => (
                  <button key={item.id} className="saved-item" onClick={() => speakText(item.natural)}>
                    <div>
                      <strong>{item.natural}</strong>
                      <span>{item.why}</span>
                    </div>
                    <span className="pill">{dueLabel(item, Date.now())}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {(screen === 'write' || screen === 'speak') && (
          <section className={`screen ${screen === 'speak' ? 'dark-screen' : ''}`}>
            <div className="sub-header">
              <button className="back-btn" onClick={resetView}>←</button>
              <span className="sub-label">{screen === 'speak' ? 'FALA' : 'ESCRITA'}{reviewing ? ` · ${reviewPos + 1}/${reviewList.length}` : ''}</span>
            </div>

            <div className="scenario-box">
              <h2>{screen === 'write' ? writeScenario.label : speakScenario.label}</h2>
              <p>{screen === 'write' ? writeScenario.context : speakScenario.context}</p>
              <small>{screen === 'write' ? writeScenario.askPt : speakScenario.askPt}</small>
            </div>

            {screen === 'write' ? (
              <>
                <textarea
                  className="input-area"
                  placeholder="Escreva em inglês…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                {error && <div className="error-box">{error}</div>}
                <button className={`submit-btn ${draft.trim() ? 'ready' : ''}`} onClick={() => submitAnswer('write')} disabled={loading}>
                  {loading ? 'Corrigindo…' : 'Verificar'}
                </button>
              </>
            ) : (
              <>
                <div className="transcript-box">
                  <span className="hint">{recording ? 'OUVINDO…' : (transcript ? 'VOCÊ DISSE' : 'TOQUE NO MICROFONE E FALE')}</span>
                  <div>{transcript || (speakTyped || '...')}</div>
                </div>
                {speechSupported ? (
                  <button className={`mic-btn ${recording ? 'recording' : ''}`} onClick={toggleRec}>
                    <span className="mic-inner" />
                  </button>
                ) : (
                  <textarea
                    className="input-area compact"
                    placeholder="Digite o que você diria…"
                    value={speakTyped}
                    onChange={(e) => setSpeakTyped(e.target.value)}
                  />
                )}
                {error && <div className="error-box dark">{error}</div>}
                <button className="submit-btn accent" onClick={() => submitAnswer('speak')} disabled={loading || (!transcript && !speakTyped)}>
                  {loading ? 'Corrigindo…' : 'Verificar'}
                </button>
              </>
            )}
          </section>
        )}

        {screen === 'result' && result && (
          <section className="screen result-screen">
            <div className="sub-header">
              <button className="back-btn" onClick={resetView}>←</button>
              <span className="sub-label">{result.mode === 'speak' ? 'FALA · CORREÇÃO' : 'ESCRITA · CORREÇÃO'}</span>
            </div>

            <div className="result-badge">
              <span className={`badge-icon ${result.verdict === 'rework' ? 'warn' : 'ok'}`}>{result.verdict === 'rework' ? '!' : '✓'}</span>
              <strong>{result.verdict === 'rework' ? 'Erro grave: precisa reescrever' : (result.verdict === 'good' ? 'Perfeito, soa natural' : 'Quase lá — ajuste pequeno')}</strong>
            </div>
            <div className="result-card">
              <span className="result-label">VOCÊ ESCREVEU</span>
              <p>{result.original}</p>
            </div>

            <div className="result-card accent">
              <div className="result-row">
                <span className="result-label">VERSÃO NATURAL</span>
                <button className="play-btn" onClick={() => speakText(result.natural)}>▷ ouvir</button>
              </div>
              <p>{result.natural}</p>
            </div>

            <div className="insight-box">
              <strong>Por quê:</strong>
              <p>{result.why}</p>
            </div>

            {result.tip && (
              <div className="insight-box muted">
                <strong>Dica:</strong>
                <p>{result.tip}</p>
              </div>
            )}

            {result.learningPoint && (
              <div className="insight-box muted">
                <strong>Próximo foco:</strong>
                <p>{result.learningPoint}</p>
              </div>
            )}

            <div className="footer-actions">
              <button className="ghost-btn" onClick={resetView}>Início</button>
              <button className="submit-btn ready" onClick={nextScenario}>{reviewing ? (reviewPos + 1 < reviewList.length ? 'Próxima frase' : 'Concluir revisão') : 'Próximo cenário'}</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
