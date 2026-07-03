'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

// Usados só quando /api/task/generate falha (ex: sem internet) — o conteúdo
// real do dia a dia vem de tarefas geradas pelo Claude, calibradas por CEFR.
const FALLBACK_WRITE_SCENARIOS = [
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

const FALLBACK_SPEAK_SCENARIOS = [
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

const SESSION_KEY = 'cadence-session-v1';
const SESSION_SIZE = 6;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
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
  // Tarefas geradas dinamicamente não têm uma "resposta natural" de referência
  // pré-definida — sem conexão com o servidor não dá pra corrigir de verdade.
  if (!scenario.natural) {
    return {
      verdict: 'rework',
      natural: '',
      why: 'Sem conexão com o servidor, não foi possível avaliar sua resposta.',
      tip: 'Verifique sua internet e tente novamente.',
      learningPoint: '',
    };
  }

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

// Estágios do SRS: 0=hoje, 1=+1 dia (amanhã), 2=+7 dias, 3=+30 dias.
function bucketCounts(items) {
  const now = Date.now();
  const buckets = { hoje: 0, amanha: 0, semana: 0, mes: 0 };
  items.forEach((item) => {
    if (item.mastered) return;
    if (item.due <= now) { buckets.hoje += 1; return; }
    if (item.stage === 1) buckets.amanha += 1;
    else if (item.stage === 2) buckets.semana += 1;
    else buckets.mes += 1;
  });
  return buckets;
}

// Converte uma linha de review_items (Supabase) para o formato usado pela UI.
function mapReviewItem(row) {
  const c = row.content || {};
  return {
    id: row.id,
    mode: c.skill === 'speaking' ? 'speak' : 'write',
    label: c.label || '',
    context: c.context || '',
    askPt: c.askPt || '',
    natural: c.correction || '',
    why: c.note || '',
    stage: row.stage,
    mastered: row.mastered,
    due: row.next_review_at ? new Date(row.next_review_at).getTime() : Date.now(),
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia! Vamos praticar?';
  if (h < 18) return 'Boa tarde! Vamos praticar?';
  return 'Boa noite! Vamos praticar?';
}

// Só calcula a composição (quantos itens de cada tipo) — o conteúdo real das
// tarefas novas é buscado à parte, de forma assíncrona, via /api/task/generate.
function computeSessionComposition(items) {
  const due = [...items]
    .filter((it) => !it.mastered && typeof it.due === 'number' && it.due <= Date.now())
    .sort((a, b) => a.due - b.due);

  const reviewCount = Math.min(2, due.length);
  const remaining = SESSION_SIZE - reviewCount;
  const writeCount = Math.ceil(remaining / 2);
  const speakCount = remaining - writeCount;

  return { due, reviewCount, writeCount, speakCount };
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

function ReviewPipeline({ stage, mastered }) {
  const labels = ['hoje', 'amanhã', '1 sem', '1 mês'];
  const fillUpTo = mastered ? 3 : Math.min(stage ?? 0, 3);
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

export default function CadenceApp({ user, initialReviewItems, initialStreak, initialWeekDays, initialCefrLevels }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [screen, setScreen] = useState('home');
  const [originTab, setOriginTab] = useState('home');
  const [freeWriteScenario, setFreeWriteScenario] = useState(() => FALLBACK_WRITE_SCENARIOS[0]);
  const [freeSpeakScenario, setFreeSpeakScenario] = useState(() => FALLBACK_SPEAK_SCENARIOS[0]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [speakTyped, setSpeakTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [streak, setStreak] = useState(initialStreak);
  const [items, setItems] = useState(() => initialReviewItems.map(mapReviewItem));
  const [weekDays, setWeekDays] = useState(initialWeekDays);
  const [cefrLevels, setCefrLevels] = useState(initialCefrLevels);
  const [greeting, setGreeting] = useState('');
  const [queue, setQueue] = useState(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueKind, setQueueKind] = useState(null); // 'session' | 'review' | null
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Dados vêm do Server Component (page.js), lido do Supabase. Ao rodar
  // router.refresh() depois de cada exercício, esses props são atualizados
  // e re-sincronizamos o estado local sem perder a tela/fluxo em andamento.
  useEffect(() => { setStreak(initialStreak); }, [initialStreak]);
  useEffect(() => { setWeekDays(initialWeekDays); }, [initialWeekDays]);
  useEffect(() => { setItems(initialReviewItems.map(mapReviewItem)); }, [initialReviewItems]);
  useEffect(() => { setCefrLevels(initialCefrLevels); }, [initialCefrLevels]);

  useEffect(() => {
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

  const activeQueueItem = queue ? queue[queueIndex] : null;
  const writeScenario = activeQueueItem && activeQueueItem.mode === 'write' ? activeQueueItem.scenario : freeWriteScenario;
  const speakScenario = activeQueueItem && activeQueueItem.mode === 'speak' ? activeQueueItem.scenario : freeSpeakScenario;

  // Busca uma tarefa nova (TBLT, calibrada por CEFR/i+1) via Claude; usa um
  // fallback estático só se a chamada falhar (ex: sem internet).
  const fetchGeneratedTask = async (mode) => {
    try {
      const res = await fetch('/api/task/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error('generate_failed');
      const data = await res.json();
      return data.scenario;
    } catch {
      const fallbackList = mode === 'speak' ? FALLBACK_SPEAK_SCENARIOS : FALLBACK_WRITE_SCENARIOS;
      return fallbackList[Math.floor(Math.random() * fallbackList.length)];
    }
  };

  const dueItems = useMemo(() => items.filter((it) => !it.mastered && it.due <= Date.now()), [items]);
  const upcomingReview = useMemo(
    () => [...items].filter((it) => !it.mastered).sort((a, b) => a.due - b.due).slice(0, 4),
    [items],
  );
  const masteredCount = useMemo(() => items.filter((it) => it.mastered).length, [items]);

  const sessionComposition = useMemo(() => computeSessionComposition(items), [items]);
  const sessionQueue = queueKind === 'session' ? queue : null;
  const sessionActive = !!sessionQueue;
  const sessionFinishedToday = sessionActive && queueIndex >= sessionQueue.length;
  const previewTotal = sessionComposition.reviewCount + sessionComposition.writeCount + sessionComposition.speakCount;
  const displayTotal = sessionActive ? sessionQueue.length : previewTotal;
  const displayCompleted = sessionActive ? Math.min(queueIndex, displayTotal) : 0;
  const sessionWriteCount = sessionActive
    ? sessionQueue.filter((q) => q.mode === 'write' && !q.isReview).length
    : sessionComposition.writeCount;
  const sessionSpeakCount = sessionActive
    ? sessionQueue.filter((q) => q.mode === 'speak' && !q.isReview).length
    : sessionComposition.speakCount;
  const sessionReviewCount = sessionActive
    ? sessionQueue.filter((q) => q.isReview).length
    : sessionComposition.reviewCount;
  const sessionMinutes = Math.max(5, Math.round(displayTotal * 1.6));

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
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null); setRecording(false); setLevelUpBanner(null);
    if (queueKind === 'review') { setQueue(null); setQueueKind(null); setQueueIndex(0); }
  };

  const startWrite = async () => {
    setOriginTab('practice');
    setQueue(null); setQueueKind(null); setQueueIndex(0);
    setScreen('write'); setError(''); setDraft(''); setResult(null);
    setTaskLoading(true);
    const scenario = await fetchGeneratedTask('write');
    setFreeWriteScenario(scenario);
    setTaskLoading(false);
  };

  const startSpeak = async () => {
    setOriginTab('practice');
    setQueue(null); setQueueKind(null); setQueueIndex(0);
    setScreen('speak'); setError(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setTaskLoading(true);
    const scenario = await fetchGeneratedTask('speak');
    setFreeSpeakScenario(scenario);
    setTaskLoading(false);
  };

  const startOrContinueSession = async () => {
    if (sessionFinishedToday) return;
    setOriginTab('home');
    if (sessionActive) {
      setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
      setScreen(sessionQueue[queueIndex].mode);
      return;
    }

    const { due, reviewCount, writeCount, speakCount } = computeSessionComposition(items);
    if (reviewCount + writeCount + speakCount === 0) return;

    setSessionLoading(true);
    const [writeTasks, speakTasks] = await Promise.all([
      Promise.all(Array.from({ length: writeCount }, () => fetchGeneratedTask('write'))),
      Promise.all(Array.from({ length: speakCount }, () => fetchGeneratedTask('speak'))),
    ]);
    setSessionLoading(false);

    const freshQueue = [
      ...due.slice(0, reviewCount).map((it) => ({ mode: it.mode, scenario: it, isReview: true })),
      ...writeTasks.map((scenario) => ({ mode: 'write', scenario, isReview: false })),
      ...speakTasks.map((scenario) => ({ mode: 'speak', scenario, isReview: false })),
    ];

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

  // reviewItem: linha atualizada/criada em review_items (vinda do backend),
  // ou null quando não havia nada a agendar (acerto numa tarefa nova).
  const finalizeResult = (feedback, reviewItem, mode, text, levelUp) => {
    const passed = feedback.verdict !== 'rework';

    if (reviewItem) {
      const mapped = mapReviewItem(reviewItem);
      setItems((prev) => {
        const exists = prev.some((it) => it.id === mapped.id);
        return exists ? prev.map((it) => (it.id === mapped.id ? mapped : it)) : [mapped, ...prev];
      });
    }

    if (levelUp) {
      setCefrLevels((prev) => ({ ...prev, [levelUp.skill]: levelUp.level }));
      setLevelUpBanner(levelUp);
    }

    setResult({
      ...feedback,
      original: text,
      mode,
      pass: passed,
      stage: reviewItem ? reviewItem.stage : 0,
      mastered: reviewItem ? reviewItem.mastered : false,
      isReview: !!activeQueueItem?.isReview,
    });
    setScreen('result');
    setLoading(false);

    // Recarrega streak/gráfico semanal do servidor sem perder o estado da tela atual.
    router.refresh();
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
    const reviewItemId = activeQueueItem?.isReview ? scenario.id : null;
    const payload = {
      mode,
      userText: text,
      scenario,
      reviewItemId,
      memory: items.slice(0, 3).map((item) => ({ natural: item.natural, why: item.why })),
    };

    try {
      const res = await fetch('/api/exercise/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('submit_failed');
      const data = await res.json();
      finalizeResult(data.feedback, data.reviewItem, mode, text, data.levelUp);
    } catch {
      const fallback = localCorrect(scenario, text);
      finalizeResult(fallback, null, mode, text, null);
    }
  };

  const advanceQueue = async () => {
    setLevelUpBanner(null);
    if (!queue) {
      const nextMode = result?.mode === 'speak' ? 'speak' : 'write';
      setTranscript(''); setSpeakTyped(''); setDraft(''); setError(''); setResult(null);
      setScreen(nextMode);
      setTaskLoading(true);
      const scenario = await fetchGeneratedTask(nextMode);
      if (nextMode === 'speak') setFreeSpeakScenario(scenario);
      else setFreeWriteScenario(scenario);
      setTaskLoading(false);
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

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
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
                <div className="topbar-right">
                  <div className="streak-pill">
                    <span className="dot" />
                    <strong>{streak}</strong>
                    <span>dias</span>
                  </div>
                  <button className="avatar-btn" onClick={signOut} disabled={signingOut} title={user?.email ? `Sair (${user.email})` : 'Sair'}>
                    {user?.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" />
                    ) : (
                      <span>{(user?.email || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="session-card">
                <div className="session-top">
                  <SessionRing completed={displayCompleted} total={displayTotal} />
                  <div className="session-info">
                    <span className="session-meta">SESSÃO DE HOJE</span>
                    <span className="session-title">{sessionMinutes} min · {displayTotal} itens</span>
                  </div>
                </div>
                <div className="session-breakdown">
                  <span>{sessionWriteCount} escrita</span>
                  <span>{sessionSpeakCount} fala</span>
                  <span>{sessionReviewCount} revisão</span>
                </div>
                <button className="session-cta" onClick={startOrContinueSession} disabled={sessionFinishedToday || sessionLoading || displayTotal === 0}>
                  {sessionFinishedToday ? 'Sessão concluída ✓' : sessionLoading ? 'Preparando sessão…' : sessionActive ? 'Continuar sessão' : 'Começar sessão'}
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
                <h4>Nível (CEFR)</h4>
                <div className="level-row">
                  <div className="level-card">
                    <span className="level-tag">{cefrLevels.writing}</span>
                    <span>Escrita</span>
                  </div>
                  <div className="level-card">
                    <span className="level-tag">{cefrLevels.speaking}</span>
                    <span>Fala</span>
                  </div>
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

              {taskLoading ? (
                <div className="scenario-box scenario-loading">
                  <p>Gerando uma tarefa nova pro seu nível…</p>
                </div>
              ) : (
                <>
                  <div className="scenario-box">
                    <h2>{screen === 'write' ? writeScenario.label : speakScenario.label}</h2>
                    <p>{screen === 'write' ? writeScenario.context : speakScenario.context}</p>
                    <small>{screen === 'write' ? writeScenario.askPt : speakScenario.askPt}</small>
                  </div>
                  {(screen === 'write' ? writeScenario.presentation : speakScenario.presentation) && (
                    <div className="presentation-box">
                      <span className="presentation-label">APRENDA ANTES DE TENTAR</span>
                      <p>{screen === 'write' ? writeScenario.presentation : speakScenario.presentation}</p>
                    </div>
                  )}
                </>
              )}

              {!taskLoading && (screen === 'write' ? (
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
              ))}
            </section>
          )}

          {screen === 'result' && result && (
            <section className="screen result-screen">
              <div className="sub-header">
                <button className="back-btn" onClick={resetView}>←</button>
                <span className="sub-label">{result.mode === 'speak' ? 'FALA · CORREÇÃO' : 'ESCRITA · CORREÇÃO'}</span>
              </div>

              {levelUpBanner && (
                <div className="level-up-banner">
                  🎉 Você subiu de nível em {levelUpBanner.skill === 'speaking' ? 'fala' : 'escrita'}: agora é <strong>{levelUpBanner.level}</strong>
                </div>
              )}

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

              <ReviewPipeline stage={result.stage} mastered={result.mastered} />

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
