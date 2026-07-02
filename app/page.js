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
const SESSION_KEY = 'cadence-session-v1';
const SESSION_SIZE = 6;
const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseStored() {
  if (typeof window === 'undefined') return { streak: 1, items: [], activity: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { streak: 1, items: [], activity: {} };
    const parsed = JSON.parse(raw);
    return {
      streak: parsed.streak || 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      lastSeen: parsed.lastSeen || '',
      activity: parsed.activity && typeof parsed.activity === 'object' ? parsed.activity : {},
    };
  } catch {
    return { streak: 1, items: [], activity: {} };
  }
}

function loadStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey() || !Array.isArray(parsed.queue)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Reviewing an item advances its own stage instead of always jumping to the
// next milestone, so "amanhã" is reachable on a first pass and not skipped.
function scheduleItem(item, passed) {
  const oldStage = item.stage || 0;
  if (!passed) {
    return { ...item, stage: 0, mastered: false, due: Date.now() + SCHEDULE[0] * 86400000, lastResult: 'fail' };
  }
  const dueDays = SCHEDULE[Math.min(oldStage, SCHEDULE.length - 1)];
  const newStage = oldStage + 1;
  const mastered = newStage >= SCHEDULE.length;
  const due = mastered ? Date.now() + 365 * 86400000 : Date.now() + dueDays * 86400000;
  return { ...item, stage: mastered ? SCHEDULE.length : newStage, mastered, due, lastResult: 'ok' };
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
        tip: 'Use “I’m not sure que…” para suavizar a discordância.',
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

function reviewTag(item, now) {
  if (item.due <= now) return 'hoje';
  const d = Math.ceil((item.due - now) / 86400000);
  return `+${d} dia${d > 1 ? 's' : ''}`;
}

function bucketCounts(items) {
  const now = Date.now();
  const buckets = { hoje: 0, amanha: 0, semana: 0, mes: 0 };
  items.forEach((item) => {
    if (item.mastered) return;
    if (item.due <= now) { buckets.hoje += 1; return; }
    if ((item.stage || 0) === 0) buckets.amanha += 1;
    else if (item.stage === 1) buckets.semana += 1;
    else buckets.mes += 1;
  });
  return buckets;
}

function getWeekDays() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);
  const today = getTodayKey();
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: WEEKDAY_LABELS[i], isToday: key === today });
  }
  return days;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia! Vamos praticar?';
  if (h < 18) return 'Boa tarde! Vamos praticar?';
  return 'Boa noite! Vamos praticar?';
}

function buildSessionQueue(items, writeStart, speakStart) {
  const due = [...items]
    .filter((it) => !it.mastered && typeof it.due === 'number' && it.due <= Date.now())
    .sort((a, b) => a.due - b.due);

  const reviewCount = Math.min(2, due.length);
  const remaining = SESSION_SIZE - reviewCount;
  const writeCount = Math.ceil(remaining / 2);
  const speakCount = remaining - writeCount;

  const queue = [];
  for (let i = 0; i < reviewCount; i += 1) {
    queue.push({ mode: due[i].mode === 'speak' ? 'speak' : 'write', scenario: due[i], isReview: true });
  }
  for (let i = 0; i < writeCount; i += 1) {
    queue.push({ mode: 'write', scenario: WRITE_SCENARIOS[(writeStart + i) % WRITE_SCENARIOS.length], isReview: false });
  }
  for (let i = 0; i < speakCount; i += 1) {
    queue.push({ mode: 'speak', scenario: SPEAK_SCENARIOS[(speakStart + i) % SPEAK_SCENARIOS.length], isReview: false });
  }
  return queue;
}

// Word-level LCS diff — used to highlight the exact change between what the
// user wrote/said and the natural version, instead of just showing both.
function diffWords(oldText, newText) {
  const a = (oldText || '').split(/\s+/).filter(Boolean);
  const b = (newText || '').split(/\s+/).filter(Boolean);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i].toLowerCase() === b[j].toLowerCase()
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i].toLowerCase() === b[j].toLowerCase()) {
      ops.push({ type: 'same', text: b[j] });
      i += 1; j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'removed', text: a[i] });
      i += 1;
    } else {
      ops.push({ type: 'added', text: b[j] });
      j += 1;
    }
  }
  while (i < m) { ops.push({ type: 'removed', text: a[i] }); i += 1; }
  while (j < n) { ops.push({ type: 'added', text: b[j] }); j += 1; }
  return ops;
}

function badgeCopy(result, editCount) {
  if (result.verdict === 'rework') return 'Erro grave: precisa reescrever';
  if (result.verdict === 'good') return result.mode === 'speak' ? 'Perfeito, soou natural' : 'Perfeito, ficou natural';
  if (result.mode === 'speak') return 'Entendível, mas pode soar mais natural';
  return `Quase lá — ${editCount} ajuste${editCount > 1 ? 's' : ''}`;
}

function DiffLine({ original, natural }) {
  const ops = useMemo(() => diffWords(original, natural), [original, natural]);
  return (
    <p>
      {ops.map((op, idx) => {
        if (op.type === 'removed') return <span key={idx} className="diff-removed">{op.text} </span>;
        if (op.type === 'added') return <span key={idx} className="diff-added">{op.text} </span>;
        return <span key={idx}>{op.text} </span>;
      })}
    </p>
  );
}

function ReviewPipeline({ due, mastered }) {
  const labels = ['hoje', 'amanhã', '1 sem', '1 mês'];
  const days = Math.round(((due || Date.now()) - Date.now()) / 86400000);
  const fillUpTo = mastered ? 3 : days <= 1 ? 1 : days <= 7 ? 2 : 3;
  return (
    <div className="pipeline-box">
      <span className="pipeline-label">VOLTA PARA REVISÃO</span>
      <div className="pipeline-track">
        {labels.map((label, idx) => (
          <div key={label} className={`pipeline-step ${idx <= fillUpTo ? 'filled' : ''}`}>
            <span className="pipeline-dot" />
            <span>{idx === 3 && mastered ? 'dominado' : label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionRing({ completed, total }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(completed / total, 1) : 0;
  const offset = c * (1 - fraction);
  return (
    <div className="session-ring">
      <svg width={size} height={size}>
        <circle className="session-ring-track" cx={size / 2} cy={size / 2} r={r} />
        <circle className="session-ring-fill" cx={size / 2} cy={size / 2} r={r} strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="session-ring-label">{completed}/{total}</div>
    </div>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconPractice() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}

function IconProgress() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19V10M12 19V5M19 19v-7" />
    </svg>
  );
}

export default function HomePage() {
  const [screen, setScreen] = useState('home');
  const [originTab, setOriginTab] = useState('home');
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
  const [activity, setActivity] = useState({});
  const [greeting, setGreeting] = useState('');
  const [queue, setQueue] = useState(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueKind, setQueueKind] = useState(null); // 'session' | 'review' | null
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
    setStreak(nextStreak);
    setItems(stored.items || []);
    setActivity(stored.activity || {});
    setGreeting(getGreeting());

    const storedSession = loadStoredSession();
    if (storedSession) {
      setQueue(storedSession.queue);
      setQueueIndex(storedSession.index || 0);
      setQueueKind('session');
    }

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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak, lastSeen: getTodayKey(), items, activity }));
  }, [items, streak, activity]);

  const activeQueueItem = queue ? queue[queueIndex] : null;
  const writeScenario = activeQueueItem && activeQueueItem.mode === 'write' ? activeQueueItem.scenario : WRITE_SCENARIOS[writeIdx];
  const speakScenario = activeQueueItem && activeQueueItem.mode === 'speak' ? activeQueueItem.scenario : SPEAK_SCENARIOS[speakIdx];

  const dueItems = useMemo(() => items.filter((it) => !it.mastered && it.due <= Date.now()), [items]);
  const upcomingReview = useMemo(
    () => [...items].filter((it) => !it.mastered).sort((a, b) => a.due - b.due).slice(0, 4),
    [items],
  );
  const masteredCount = useMemo(() => items.filter((it) => it.mastered).length, [items]);

  const sessionPreview = useMemo(() => buildSessionQueue(items, writeIdx, speakIdx), [items, writeIdx, speakIdx]);
  const sessionQueue = queueKind === 'session' ? queue : null;
  const sessionActive = !!sessionQueue;
  const sessionFinishedToday = sessionActive && queueIndex >= sessionQueue.length;
  const displayQueue = sessionActive ? sessionQueue : sessionPreview;
  const displayCompleted = sessionActive ? Math.min(queueIndex, displayQueue.length) : 0;
  const sessionWriteCount = displayQueue.filter((q) => q.mode === 'write' && !q.isReview).length;
  const sessionSpeakCount = displayQueue.filter((q) => q.mode === 'speak' && !q.isReview).length;
  const sessionReviewCount = displayQueue.filter((q) => q.isReview).length;
  const sessionMinutes = Math.max(5, Math.round(displayQueue.length * 1.6));

  const weekDays = useMemo(() => getWeekDays().map((d) => ({ ...d, count: activity[d.key] || 0 })), [activity]);
  const maxWeekCount = Math.max(1, ...weekDays.map((d) => d.count));
  const buckets = useMemo(() => bucketCounts(items), [items]);
  const maxBucket = Math.max(1, buckets.hoje, buckets.amanha, buckets.semana, buckets.mes);
  const pipelineRows = [
    { key: 'hoje', label: 'hoje', count: buckets.hoje },
    { key: 'amanha', label: 'amanhã', count: buckets.amanha },
    { key: 'semana', label: '1 sem', count: buckets.semana },
    { key: 'mes', label: '1 mês', count: buckets.mes },
  ];

  const isLastInQueue = !queue || queueIndex + 1 >= queue.length;
  const queueButtonLabel = queueKind === 'session'
    ? (isLastInQueue ? 'Concluir sessão' : 'Próximo da sessão')
    : queueKind === 'review'
      ? (isLastInQueue ? 'Concluir revisão' : 'Próxima frase')
      : 'Próximo cenário';

  const diffEditCount = result ? Math.max(1, diffWords(result.original, result.natural).filter((o) => o.type === 'removed').length) : 1;

  const resetView = () => {
    setScreen(originTab);
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null); setRecording(false);
    if (queueKind === 'review') { setQueue(null); setQueueKind(null); setQueueIndex(0); }
  };

  const startWrite = () => {
    setOriginTab('practice');
    setQueue(null); setQueueKind(null); setQueueIndex(0);
    setScreen('write'); setError(''); setDraft(''); setResult(null);
  };

  const startSpeak = () => {
    setOriginTab('practice');
    setQueue(null); setQueueKind(null); setQueueIndex(0);
    setScreen('speak'); setError(''); setTranscript(''); setSpeakTyped(''); setResult(null);
  };

  const startOrContinueSession = () => {
    if (sessionFinishedToday) return;
    setOriginTab('home');
    if (sessionActive) {
      setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
      setScreen(sessionQueue[queueIndex].mode);
      return;
    }
    const freshQueue = buildSessionQueue(items, writeIdx, speakIdx);
    if (!freshQueue.length) return;
    setQueue(freshQueue); setQueueIndex(0); setQueueKind('session');
    saveStoredSession({ date: getTodayKey(), queue: freshQueue, index: 0 });
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(freshQueue[0].mode);
  };

  const startSingleReview = (item) => {
    setOriginTab('home');
    setQueue([{ mode: item.mode, scenario: item, isReview: true }]);
    setQueueIndex(0);
    setQueueKind('review');
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(item.mode);
  };

  const startFullReview = () => {
    const due = [...items].filter((it) => !it.mastered && it.due <= Date.now()).sort((a, b) => a.due - b.due);
    if (!due.length) return;
    setOriginTab('home');
    const reviewQueue = due.map((it) => ({ mode: it.mode, scenario: it, isReview: true }));
    setQueue(reviewQueue); setQueueIndex(0); setQueueKind('review');
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(reviewQueue[0].mode);
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

  const finalizeResult = (resultData, mode, text) => {
    const scenario = mode === 'speak' ? speakScenario : writeScenario;
    const passed = resultData.verdict !== 'rework';
    let scheduled;

    if (activeQueueItem?.isReview) {
      const existing = items.find((it) => it.id === scenario.id) || scenario;
      const merged = {
        ...existing,
        natural: resultData.natural || existing.natural,
        why: resultData.why,
        tip: resultData.tip,
        learningPoint: resultData.learningPoint,
      };
      scheduled = scheduleItem(merged, passed);
      setItems((prev) => prev.map((it) => (it.id === scheduled.id ? scheduled : it)));
    } else {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        label: scenario.label,
        context: scenario.context,
        askPt: scenario.askPt,
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
      scheduled = scheduleItem(entry, passed);
      setItems((prev) => [scheduled, ...prev].slice(0, 40));
    }

    setActivity((prev) => ({ ...prev, [getTodayKey()]: (prev[getTodayKey()] || 0) + 1 }));

    setResult({
      ...resultData,
      original: text,
      mode,
      pass: passed,
      stage: scheduled.stage,
      mastered: scheduled.mastered,
      due: scheduled.due,
      isReview: !!activeQueueItem?.isReview,
    });
    setScreen('result');
    setLoading(false);
  };

  const submitAnswer = async (mode) => {
    const text = mode === 'speak' ? (transcript || speakTyped).trim() : draft.trim();
    if (!text) {
      setError(mode === 'speak' ? 'Fale ou digite sua resposta primeiro.' : 'Escreva sua resposta primeiro.');
      return;
    }

    setLoading(true);
    setError('');

    const scenario = mode === 'speak' ? speakScenario : writeScenario;
    const payload = {
      mode,
      userText: text,
      scenario,
      memory: items.slice(0, 3).map((item) => ({ natural: item.natural, why: item.why })),
    };

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const normalized = normalizeResult(data, scenario);
      const resultData = normalized || localCorrect(scenario, text);
      finalizeResult(resultData, mode, text);
    } catch {
      const fallback = localCorrect(scenario, text);
      finalizeResult(fallback, mode, text);
    }
  };

  const advanceQueue = () => {
    if (!queue) {
      if (result?.mode === 'speak') {
        setSpeakIdx((prev) => (prev + 1) % SPEAK_SCENARIOS.length);
        setTranscript(''); setSpeakTyped(''); setError(''); setResult(null);
        setScreen('speak');
      } else {
        setWriteIdx((prev) => (prev + 1) % WRITE_SCENARIOS.length);
        setDraft(''); setError(''); setResult(null);
        setScreen('write');
      }
      return;
    }

    const nextIndex = queueIndex + 1;
    setDraft(''); setTranscript(''); setSpeakTyped(''); setError(''); setResult(null);

    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      if (queueKind === 'session') saveStoredSession({ date: getTodayKey(), queue, index: nextIndex });
      setScreen(queue[nextIndex].mode);
      return;
    }

    setQueueIndex(nextIndex);
    if (queueKind === 'session') {
      saveStoredSession({ date: getTodayKey(), queue, index: nextIndex });
    } else {
      setQueue(null); setQueueKind(null); setQueueIndex(0);
    }
    setScreen(originTab);
  };

  const redoAttempt = () => {
    setError(''); setResult(null);
    if (result?.mode === 'speak') { setTranscript(''); setSpeakTyped(''); }
    else { setDraft(''); }
    setScreen(result?.mode === 'speak' ? 'speak' : 'write');
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

  const showTabs = ['home', 'practice', 'progress'].includes(screen);

  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="app-body">
          {screen === 'home' && (
            <section className="screen home-screen">
              <div className="topbar">
                <div>
                  <div className="logo">cadence</div>
                  <p className="greeting">{greeting}</p>
                </div>
                <div className="streak-pill">
                  <span className="dot" />
                  <strong>{streak}</strong>
                  <span>dias</span>
                </div>
              </div>

              <div className="session-card">
                <div className="session-top">
                  <SessionRing completed={displayCompleted} total={displayQueue.length} />
                  <div className="session-info">
                    <span className="session-meta">SESSÃO DE HOJE</span>
                    <span className="session-title">{sessionMinutes} min · {displayQueue.length} itens</span>
                  </div>
                </div>
                <div className="session-breakdown">
                  <span>{sessionWriteCount} escrita</span>
                  <span>{sessionSpeakCount} fala</span>
                  <span>{sessionReviewCount} revisão</span>
                </div>
                <button className="session-cta" onClick={startOrContinueSession} disabled={sessionFinishedToday || displayQueue.length === 0}>
                  {sessionFinishedToday ? 'Sessão concluída ✓' : sessionActive ? 'Continuar sessão' : 'Começar sessão'}
                </button>
              </div>

              <div>
                <div className="section-title">
                  <h3>Para revisar</h3>
                  <span>repetição espaçada</span>
                </div>
                <div className="review-list">
                  {upcomingReview.length === 0 ? (
                    <div className="empty-state">Cada correção vira uma frase salva aqui e volta na hora certa.</div>
                  ) : upcomingReview.map((item) => (
                    <button key={item.id} className="review-row" onClick={() => startSingleReview(item)}>
                      <div>
                        <strong>{item.natural}</strong>
                        <span>{item.why}</span>
                      </div>
                      <span className="review-tag">{reviewTag(item, Date.now())}</span>
                    </button>
                  ))}
                </div>
                {dueItems.length > 0 && (
                  <button className="review-more" onClick={startFullReview}>revisar todas ({dueItems.length})</button>
                )}
              </div>
            </section>
          )}

          {screen === 'practice' && (
            <section className="screen practice-screen">
              <div className="topbar">
                <div>
                  <div className="logo">cadence</div>
                  <p className="greeting">O que vamos praticar?</p>
                </div>
              </div>

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
                    <div className="empty-state">Suas frases corrigidas aparecem aqui.</div>
                  ) : items.slice(0, 8).map((item) => (
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

          {screen === 'progress' && (
            <section className="screen progress-screen">
              <div className="progress-header">
                <h1>Progresso</h1>
              </div>

              <div className="stat-row">
                <div className="stat-card">
                  <strong>{streak}</strong>
                  <span>dias seguidos</span>
                </div>
                <div className="stat-card">
                  <strong>{masteredCount}</strong>
                  <span>itens dominados</span>
                </div>
              </div>

              <div className="chart-card">
                <h4>Minutos esta semana</h4>
                <div className="bar-chart">
                  {weekDays.map((d) => (
                    <div key={d.key} className={`bar-col ${d.isToday ? 'today' : ''}`}>
                      <div className="bar-fill" style={{ height: `${Math.max(6, Math.round((d.count / maxWeekCount) * 100))}%` }} />
                      <span>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <h4>Memória espaçada</h4>
                <div className="pipeline-list">
                  {pipelineRows.map((row) => (
                    <div key={row.key} className="pipeline-row">
                      <span className="pipeline-row-label">{row.label}</span>
                      <div className="pipeline-row-track">
                        <div className="pipeline-row-fill" style={{ width: `${(row.count / maxBucket) * 100}%` }} />
                      </div>
                      <span className="pipeline-row-count">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {(screen === 'write' || screen === 'speak') && (
            <section className={`screen ${screen === 'speak' ? 'dark-screen' : ''}`}>
              <div className="sub-header">
                <button className="back-btn" onClick={resetView}>←</button>
                <span className="sub-label">{screen === 'speak' ? 'FALA' : 'ESCRITA'}</span>
                {queue && <span className="sub-count">{queueIndex + 1}/{queue.length}</span>}
              </div>
              {queue && (
                <div className="session-progress-track">
                  <div className="session-progress-fill" style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }} />
                </div>
              )}

              <div className="scenario-box">
                <h2>{screen === 'write' ? writeScenario.label : speakScenario.label}</h2>
                <p>{screen === 'write' ? writeScenario.context : speakScenario.context}</p>
                <small>{screen === 'write' ? writeScenario.askPt : speakScenario.askPt}</small>
              </div>

              {screen === 'write' ? (
                <>
                  <div className="input-wrap">
                    <textarea
                      className="input-area"
                      placeholder="Escreva em inglês…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="input-footer">
                      <span className="char-count">{draft.length} caracteres</span>
                      <span className="lang-select" title="Somente inglês por enquanto">EN ▾</span>
                    </div>
                  </div>
                  {error && <div className="error-box">{error}</div>}
                  <button className={`submit-btn ${draft.trim() ? 'ready' : ''}`} onClick={() => submitAnswer('write')} disabled={loading}>
                    {loading ? 'Corrigindo…' : 'Verificar'}
                  </button>
                </>
              ) : (
                <>
                  <div className="transcript-box">
                    <span className="hint">{recording && <span className="rec-dot" />}{recording ? 'OUVINDO…' : (transcript ? 'VOCÊ DISSE' : 'TOQUE NO MICROFONE E FALE')}</span>
                    <div>{transcript || (speakTyped || '...')}</div>
                  </div>
                  {speechSupported ? (
                    <>
                      <button className={`mic-btn ${recording ? 'recording' : ''}`} onClick={toggleRec}>
                        <span className="mic-inner" />
                      </button>
                      <div className="mic-caption">{recording ? 'toque para parar' : 'toque para falar'}</div>
                    </>
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
                <strong>{badgeCopy(result, diffEditCount)}</strong>
              </div>

              <div className="result-card">
                <span className="result-label">{result.mode === 'speak' ? 'VOCÊ FALOU' : 'VOCÊ ESCREVEU'}</span>
                <DiffLine original={result.original} natural={result.natural} />
              </div>

              <div className="result-card accent">
                <div className="result-row">
                  <span className="result-label">{result.mode === 'speak' ? 'COMO UM NATIVO DIRIA' : 'VERSÃO NATURAL'}</span>
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

              <ReviewPipeline due={result.due} mastered={result.mastered} />

              <div className="footer-actions">
                {result.mode === 'speak' && (
                  <button className="icon-btn" onClick={redoAttempt} title="Tentar de novo">↺</button>
                )}
                <button className="submit-btn ready" style={{ flex: 1 }} onClick={advanceQueue}>{queueButtonLabel}</button>
              </div>
            </section>
          )}
        </div>

        {showTabs && (
          <nav className="bottom-nav">
            <button className={`nav-btn ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
              <IconHome />
              <span>Hoje</span>
            </button>
            <button className={`nav-btn ${screen === 'practice' ? 'active' : ''}`} onClick={() => setScreen('practice')}>
              <IconPractice />
              <span>Praticar</span>
            </button>
            <button className={`nav-btn ${screen === 'progress' ? 'active' : ''}`} onClick={() => setScreen('progress')}>
              <IconProgress />
              <span>Progresso</span>
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
