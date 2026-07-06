'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { mapLedgerItem, ledgerStatus } from '../lib/ledger';
import { composeSession } from '../lib/session';
import { getStage, trackLabel, TRACKS } from '../lib/tracks';
import { computePatent } from '../lib/patents';

const SESSION_KEY = 'cadence-session-v2';

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

function dueLabel(item, now) {
  if (item.mastered) return 'dominado';
  if (item.due <= now) return 'hoje';
  const d = Math.ceil((item.due - now) / 86400000);
  return d <= 1 ? 'amanhã' : d < 7 ? `+${d}d` : d < 30 ? '1 sem' : '1 mês';
}

// hoje / amanhã / 1 sem / 1 mês — pipeline SRS (§3.5), mapeado 1:1 pro stage.
function bucketCounts(ledger) {
  const now = Date.now();
  const buckets = { hoje: 0, amanha: 0, semana: 0, mes: 0 };
  ledger.forEach((item) => {
    if (item.mastered) return;
    if (item.due <= now) { buckets.hoje += 1; return; }
    if (item.stage === 1) buckets.amanha += 1;
    else if (item.stage === 2) buckets.semana += 1;
    else buckets.mes += 1;
  });
  return buckets;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia! Vamos praticar?';
  if (h < 18) return 'Boa tarde! Vamos praticar?';
  return 'Boa noite! Vamos praticar?';
}

// Reconstrói o texto do usuário com o(s) trecho(s) problemático(s) riscados
// e a correção inserida ao lado — o card "VOCÊ ESCREVEU" do PDF de referência.
function HighlightedAnswer({ userText, problemas, veredito }) {
  const list = problemas || [];
  if (!list.length) return <p>{userText}</p>;

  let remaining = userText;
  let offset = 0;
  const segments = [];
  list.forEach((p, idx) => {
    const needle = (p.trecho_problema || '').toLowerCase();
    if (!needle) return;
    const i = remaining.toLowerCase().indexOf(needle);
    if (i === -1) return;
    segments.push({ type: 'text', key: `t${idx}`, text: remaining.slice(0, i) });
    segments.push({ type: 'strike', key: `s${idx}`, text: remaining.slice(i, i + needle.length), insert: p.correcao });
    remaining = remaining.slice(i + needle.length);
    offset += 1;
  });
  segments.push({ type: 'text', key: 'tail', text: remaining });

  if (offset === 0) return <p>{userText}</p>;
  const amberClass = veredito === 'nao_natural' ? 'amber' : '';

  return (
    <p>
      {segments.map((seg) => {
        if (seg.type === 'strike') {
          return (
            <span key={seg.key}>
              <span className={`answer-strike ${amberClass}`}>{seg.text}</span>{' '}
              <span className="answer-insert">{seg.insert}</span>{' '}
            </span>
          );
        }
        return <span key={seg.key}>{seg.text}</span>;
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

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
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

export default function CadenceApp({
  user,
  initialLedger,
  initialCadenceWeeks,
  initialCadenceStreak,
  initialWeekDays,
  initialSkillProgress,
  initialProfile,
  initialStageCompletions,
  initialThemeSelection,
  initialSnapshotCount,
  initialSnapshotDue,
  initialOldestSnapshot,
  initialNewestSnapshot,
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [screen, setScreen] = useState('home');
  const [originTab, setOriginTab] = useState('home');
  const [draft, setDraft] = useState('');
  const [transcript, setTranscript] = useState('');
  const [speakTyped, setSpeakTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [queue, setQueue] = useState(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueKind, setQueueKind] = useState(null); // 'session' | 'boss' | null
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [rewriteText, setRewriteText] = useState('');
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [sessionMasteryEvents, setSessionMasteryEvents] = useState([]);
  // §8 — recuperação ativa: por evento de mastery com recall anexado, guarda
  // o palpite do aluno e se já foi revelada a explicação real.
  const [recallGuesses, setRecallGuesses] = useState({});
  const [recallResults, setRecallResults] = useState({});
  const [recallRevealed, setRecallRevealed] = useState({});
  const [recallSubmitting, setRecallSubmitting] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  // §5 (correction_timing="end_of_exercise"): correções ficam num ref (leitura
  // síncrona, sem esperar re-render) até a sessão acabar; só então são
  // revisadas uma a uma, reescrita continuando obrigatória em cada uma.
  const recordModeRef = useRef('original'); // 'original' | 'rewrite' (§3)
  const deferredResultsRef = useRef([]);
  const [deferredIndex, setDeferredIndex] = useState(null);
  const [deferredTotal, setDeferredTotal] = useState(0);
  // §4 — reforço imediato: 1-2 variações curtas do mesmo padrão, ainda dentro
  // do exercício do dia, depois da reescrita. Não mexe em review_items — é
  // reforço de curto prazo, o SRS de dias continua sendo o de longo prazo.
  const [drills, setDrills] = useState(null);
  const [drillsLoading, setDrillsLoading] = useState(false);
  const [drillAnswers, setDrillAnswers] = useState({});
  const [drillResults, setDrillResults] = useState({});
  const [drillChecking, setDrillChecking] = useState(null);
  // §6 — roleplay curto por tema (TBLT): correção só no final da troca
  // inteira, nunca interrompendo o fluxo da simulação.
  const [roleplayTranscript, setRoleplayTranscript] = useState([]);
  const [roleplayPremise, setRoleplayPremise] = useState('');
  const [roleplayDone, setRoleplayDone] = useState(false);
  const [roleplaySending, setRoleplaySending] = useState(false);
  const [roleplayInput, setRoleplayInput] = useState('');
  const [roleplayResult, setRoleplayResult] = useState(null);
  const [roleplayFinishing, setRoleplayFinishing] = useState(false);
  // §7 — antes/depois tangível: só reaparece a cada ~4 semanas (calculado no
  // servidor em app/page.js); só mostra comparação com 2+ snapshots salvos.
  const [snapshotCount, setSnapshotCount] = useState(initialSnapshotCount || 0);
  const [snapshotDue, setSnapshotDue] = useState(!!initialSnapshotDue);
  const [oldestSnapshot, setOldestSnapshot] = useState(initialOldestSnapshot || null);
  const [newestSnapshot, setNewestSnapshot] = useState(initialNewestSnapshot || null);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  const [ledger, setLedger] = useState(() => initialLedger.map(mapLedgerItem));
  const [cadenceWeeks, setCadenceWeeks] = useState(initialCadenceWeeks);
  const [cadenceStreak, setCadenceStreak] = useState(initialCadenceStreak);
  const [weekDays, setWeekDays] = useState(initialWeekDays);
  const [skillProgress, setSkillProgress] = useState(initialSkillProgress);
  const [profile, setProfile] = useState(initialProfile);
  const [stageCompletions, setStageCompletions] = useState(initialStageCompletions);
  const [themeSelection, setThemeSelection] = useState(initialThemeSelection || []);
  const [savingThemes, setSavingThemes] = useState(false);

  const [mapSkillFilter, setMapSkillFilter] = useState('all');
  const [mapStatusFilter, setMapStatusFilter] = useState('all');
  const [expandedLedgerId, setExpandedLedgerId] = useState(null);

  useEffect(() => { setLedger(initialLedger.map(mapLedgerItem)); }, [initialLedger]);
  useEffect(() => { setCadenceWeeks(initialCadenceWeeks); }, [initialCadenceWeeks]);
  useEffect(() => { setCadenceStreak(initialCadenceStreak); }, [initialCadenceStreak]);
  useEffect(() => { setWeekDays(initialWeekDays); }, [initialWeekDays]);
  useEffect(() => { setSkillProgress(initialSkillProgress); }, [initialSkillProgress]);
  useEffect(() => { setProfile(initialProfile); }, [initialProfile]);
  useEffect(() => { setStageCompletions(initialStageCompletions); }, [initialStageCompletions]);
  useEffect(() => { setThemeSelection(initialThemeSelection || []); }, [initialThemeSelection]);

  useEffect(() => {
    setGreeting(getGreeting());

    // Fricção de entrada: sem menu/dashboard antes — ao abrir o app já
    // logado, cai direto no exercício do dia (revisão vencida + novo, já
    // montado por composeSession). Só fica no "Hoje" (dashboard) quando não
    // há nada pendente hoje, servindo de tela de "já praticou" com prática
    // extra disponível via "Para revisar".
    const storedSession = loadStoredSession();
    if (storedSession) {
      const idx = storedSession.index || 0;
      setQueue(storedSession.queue);
      setQueueIndex(idx);
      setQueueKind('session');
      if (idx < storedSession.queue.length) {
        setScreen(storedSession.queue[idx].skill === 'speaking' ? 'speak' : 'write');
      }
    } else {
      const freshQueue = composeSession(initialLedger.map(mapLedgerItem), initialProfile.current_track, initialProfile.current_stage, initialThemeSelection || []);
      if (freshQueue.length) {
        setQueue(freshQueue);
        setQueueIndex(0);
        setQueueKind('session');
        saveStoredSession({ date: getTodayKey(), queue: freshQueue, index: 0 });
        setScreen(freshQueue[0].skill === 'speaking' ? 'speak' : 'write');
      }
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
          if (event.results[i].isFinal) finalText += chunk;
          else interim += chunk;
        }
        const value = (finalText + interim).trim();
        // §3: mesma instância de reconhecimento serve pra resposta original
        // e pra "refalar" a versão corrigida — o modo decide onde o texto cai.
        if (recordModeRef.current === 'rewrite') setRewriteText(value);
        else setTranscript(value);
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

  const writingProgress = skillProgress.writing || { precisao: 0, naturalidade: 0, vocabulario: 0, fluencia: 0 };
  const speakingProgress = skillProgress.speaking || { precisao: 0, naturalidade: 0, vocabulario: 0, fluencia: 0 };
  const writingPatent = computePatent(writingProgress);
  const speakingPatent = computePatent(speakingProgress);

  const dueLedger = useMemo(() => ledger.filter((it) => !it.mastered && it.due <= Date.now()), [ledger]);
  const upcomingLedger = useMemo(
    () => [...ledger].filter((it) => !it.mastered).sort((a, b) => a.due - b.due).slice(0, 4),
    [ledger],
  );
  const masteredCount = useMemo(() => ledger.filter((it) => it.mastered).length, [ledger]);

  // Mapa de progresso por tema (§2): derivado ao vivo de review_items.content
  // ->>'categoria', sem tabela própria — evita duas fontes de verdade pro
  // mesmo dado. Sem sequência fixa: só "o que já domina" x "em trabalho".
  const topicProgress = useMemo(() => {
    const map = new Map();
    ledger.forEach((item) => {
      const key = item.categoria || 'outros';
      if (!map.has(key)) map.set(key, { categoria: key, active: 0, mastered: 0 });
      const t = map.get(key);
      if (item.mastered) t.mastered += 1;
      else t.active += 1;
    });
    return Array.from(map.values()).sort((a, b) => (b.mastered + b.active) - (a.mastered + a.active));
  }, [ledger]);
  const masteredTopics = topicProgress.filter((t) => t.active === 0 && t.mastered > 0);
  const inProgressTopics = topicProgress.filter((t) => t.active > 0);

  const sessionPreview = useMemo(
    () => composeSession(ledger, profile.current_track, profile.current_stage, themeSelection),
    [ledger, profile.current_track, profile.current_stage, themeSelection],
  );
  const sessionQueue = queueKind === 'session' ? queue : null;
  const sessionActive = !!sessionQueue;
  const sessionFinishedToday = sessionActive && queueIndex >= sessionQueue.length;
  const displayQueue = sessionActive ? sessionQueue : sessionPreview;
  const displayCompleted = sessionActive ? Math.min(queueIndex, displayQueue.length) : 0;
  const sessionWriteCount = displayQueue.filter((q) => q.skill === 'writing').length;
  const sessionSpeakCount = displayQueue.filter((q) => q.skill === 'speaking').length;
  const sessionReviewCount = displayQueue.filter((q) => q.kind === 'review').length;
  const sessionMinutes = Math.max(5, Math.round(displayQueue.length * 1.6));

  const buckets = useMemo(() => bucketCounts(ledger), [ledger]);
  const maxBucket = Math.max(1, buckets.hoje, buckets.amanha, buckets.semana, buckets.mes);
  const pipelineRows = [
    { key: 'hoje', label: 'hoje', count: buckets.hoje },
    { key: 'amanha', label: 'amanhã', count: buckets.amanha },
    { key: 'semana', label: '1 sem', count: buckets.semana },
    { key: 'mes', label: '1 mês', count: buckets.mes },
  ];

  const currentWeek = cadenceWeeks[cadenceWeeks.length - 1] || { sessions: 0 };
  const maxWeekCount = Math.max(1, ...weekDays.map((d) => d.count));

  const stageDef = getStage(profile.current_track, profile.current_stage);
  const bossAvailable = { writing: !!stageDef?.scenarios?.boss?.writing, speaking: !!stageDef?.scenarios?.boss?.speaking };
  const bossDoneThisStage = stageCompletions.some((c) => c.track === profile.current_track && c.stage === profile.current_stage);

  const filteredLedger = useMemo(() => {
    return ledger.filter((it) => {
      if (mapSkillFilter !== 'all' && it.skill !== mapSkillFilter) return false;
      if (mapStatusFilter !== 'all' && ledgerStatus(it) !== mapStatusFilter) return false;
      return true;
    });
  }, [ledger, mapSkillFilter, mapStatusFilter]);

  const isLastInQueue = !queue || queueIndex + 1 >= queue.length;
  const queueButtonLabel = queueKind === 'boss'
    ? 'Concluir desafio'
    : isLastInQueue ? 'Concluir sessão' : 'Próximo';

  const resetView = () => {
    if (recording) recognition?.stop();
    recordModeRef.current = 'original';
    setScreen(originTab);
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null); setRecording(false);
    setRewriteText(''); setRewriteResult(null);
  };

  const startOrContinueSession = () => {
    if (sessionFinishedToday) return;
    setOriginTab('home');
    if (sessionActive) {
      setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
      setScreen(sessionQueue[queueIndex].skill === 'speaking' ? 'speak' : 'write');
      return;
    }
    const freshQueue = composeSession(ledger, profile.current_track, profile.current_stage, themeSelection);
    if (!freshQueue.length) return;
    setQueue(freshQueue); setQueueIndex(0); setQueueKind('session');
    saveStoredSession({ date: getTodayKey(), queue: freshQueue, index: 0 });
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(freshQueue[0].skill === 'speaking' ? 'speak' : 'write');
  };

  const startBoss = (skill) => {
    const boss = stageDef?.scenarios?.boss?.[skill];
    if (!boss) return;
    setOriginTab('progress');
    const bossQueue = [{ kind: 'boss', skill, scenario: boss, restriction: null, reviewItemId: null }];
    setQueue(bossQueue); setQueueIndex(0); setQueueKind('boss');
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(skill === 'speaking' ? 'speak' : 'write');
  };

  const openLedgerReview = (item) => {
    setOriginTab('mapa');
    const scenario = { id: `review_${item.id}`, label: item.categoria || 'REVISÃO', context: item.formaNatural ? `Você já corrigiu isso antes: "${item.formaNatural}"` : 'Pratique esse padrão de novo.', askPt: 'Escreva/fale uma frase nova aplicando essa correção.' };
    const singleQueue = [{ kind: 'review', skill: item.skill, scenario, restriction: { patternId: item.id, structureHint: item.dica || item.pattern }, reviewItemId: item.id }];
    setQueue(singleQueue); setQueueIndex(0); setQueueKind('session');
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
    setScreen(item.skill === 'speaking' ? 'speak' : 'write');
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
      recordModeRef.current = 'original';
      recognition.start();
      setTranscript('');
      setRecording(true);
      setError('');
    } catch {
      setError('Não consegui abrir o microfone.');
    }
  };

  // §3 — "refalar" a versão corrigida com voz real (Web Speech API), não só
  // reler/retextar. Reaproveita a mesma instância de reconhecimento.
  const toggleRewriteRec = () => {
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
      recordModeRef.current = 'rewrite';
      recognition.start();
      setRewriteText('');
      setRewriteResult(null);
      setRecording(true);
      setError('');
    } catch {
      setError('Não consegui abrir o microfone.');
    }
  };

  const finalizeResult = (correction, reviewItem, skill, text, attemptId) => {
    if (reviewItem) {
      const mapped = mapLedgerItem(reviewItem);
      setLedger((prev) => {
        const exists = prev.some((it) => it.id === mapped.id);
        return exists ? prev.map((it) => (it.id === mapped.id ? mapped : it)) : [mapped, ...prev];
      });
    }

    setResult({
      ...correction,
      original: text,
      skill,
      attemptId: attemptId || null,
      stage: reviewItem ? reviewItem.stage : null,
      mastered: reviewItem ? reviewItem.mastered : false,
      isReview: activeQueueItem?.kind === 'review',
      restriction: activeQueueItem?.restriction || null,
      reinforcePattern: reviewItem?.pattern || correction.erro_ledger?.pattern || '',
      reinforceCategoria: reviewItem?.content?.categoria || correction.erro_ledger?.categoria || '',
      reinforceFormaNatural: reviewItem?.content?.forma_natural || correction.erro_ledger?.forma_natural || '',
    });
    setRewriteText(''); setRewriteResult(null);
    setScreen('result');
    setLoading(false);
    router.refresh();
  };

  const verifyRewrite = async () => {
    const text = rewriteText.trim();
    if (!text) {
      setError('Reescreva a frase antes de verificar.');
      return;
    }
    setError('');
    setRewriteLoading(true);
    try {
      const res = await fetch('/api/exercise/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: result.skill,
          versaoNatural: result.versao_natural,
          rewriteText: text,
          attemptId: result.attemptId,
        }),
      });
      const data = await res.json();
      setRewriteResult(data);
    } catch {
      setRewriteResult({ corrigido: false, comentario: 'Sem conexão agora. Tente de novo.' });
    }
    setRewriteLoading(false);
  };

  // §5 (correction_depth="flag_only"): explicação gerada só quando o aluno
  // pede — não vem de graça em toda correção.
  const requestExplanation = async () => {
    if (!result) return;
    setExplainLoading(true);
    try {
      const res = await fetch('/api/exercise/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: result.skill,
          userText: result.original,
          versaoNatural: result.versao_natural,
          problemas: result.problemas,
        }),
      });
      const data = await res.json();
      setResult((prev) => (prev ? { ...prev, porque: data.porque, exemplo_analogo: data.exemplo_analogo } : prev));
    } catch {
      setResult((prev) => (prev ? { ...prev, porque: 'Não consegui gerar a explicação agora.' } : prev));
    }
    setExplainLoading(false);
  };

  // §4 — dispara ao mostrar um resultado com padrão novo/reforçado (criar ou
  // atualizar), nunca a cada acerto isolado nem quando veredito="correto".
  useEffect(() => {
    setDrills(null); setDrillAnswers({}); setDrillResults({}); setDrillChecking(null);
    if (!result || result.veredito === 'correto' || !result.reinforcePattern) return;

    let cancelled = false;
    setDrillsLoading(true);
    fetch('/api/exercise/reinforce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill: result.skill,
        pattern: result.reinforcePattern,
        categoria: result.reinforceCategoria,
        formaNatural: result.reinforceFormaNatural,
      }),
    })
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setDrills(data.drills || []); })
      .catch(() => { if (!cancelled) setDrills([]); })
      .finally(() => { if (!cancelled) setDrillsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.original, result?.skill, result?.reinforcePattern]);

  const checkDrill = async (idx) => {
    const text = (drillAnswers[idx] || '').trim();
    if (!text || !drills) return;
    setDrillChecking(idx);
    try {
      const res = await fetch('/api/exercise/drill-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: result.skill, hint: drills[idx].hint, answerText: text }),
      });
      const data = await res.json();
      setDrillResults((prev) => ({ ...prev, [idx]: data }));
    } catch {
      setDrillResults((prev) => ({ ...prev, [idx]: { corrigido: false, comentario: 'Sem conexão agora.' } }));
    }
    setDrillChecking(null);
  };

  const updatePreference = async (key, value) => {
    setSavingPrefs(true);
    setProfile((prev) => ({ ...prev, [key]: value }));
    try {
      await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(key === 'correction_timing' ? { correctionTiming: value } : { correctionDepth: value }),
      });
    } catch {
      // preferência já foi refletida na UI; falha silenciosa aqui só significa
      // que o servidor pode não ter persistido — próxima troca tenta de novo.
    }
    setSavingPrefs(false);
  };

  // §2.2 — até 2 temas extras (além da trilha principal, que já tem
  // progressão de estágio própria) só ampliam de onde vem o material "novo".
  const MAX_EXTRA_THEMES = 2;
  const toggleTheme = async (trackId) => {
    const isSelected = themeSelection.includes(trackId);
    let next;
    if (isSelected) {
      next = themeSelection.filter((id) => id !== trackId);
    } else {
      if (themeSelection.length >= MAX_EXTRA_THEMES) return;
      next = [...themeSelection, trackId];
    }
    setThemeSelection(next);
    setSavingThemes(true);
    try {
      await fetch('/api/profile/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeIds: next }),
      });
    } catch {
      // seleção já refletida na UI — próxima troca tenta persistir de novo.
    }
    setSavingThemes(false);
  };

  const startRoleplay = async () => {
    recordModeRef.current = 'original';
    setRoleplayTranscript([]); setRoleplayPremise(''); setRoleplayDone(false);
    setRoleplayResult(null); setRoleplayInput(''); setError('');
    setOriginTab('progress');
    setScreen('roleplay');
    setRoleplaySending(true);
    try {
      const res = await fetch('/api/roleplay/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeLabel: trackLabel(profile.current_track), premise: '', transcript: [] }),
      });
      const data = await res.json();
      setRoleplayPremise(data.premise);
      setRoleplayTranscript([{ role: 'ai', text: data.reply }]);
      setRoleplayDone(!!data.done);
    } catch {
      setError('Não consegui iniciar o roleplay agora. Tente de novo.');
    }
    setRoleplaySending(false);
  };

  const sendRoleplayTurn = async () => {
    const text = (transcript || roleplayInput).trim();
    if (!text || roleplaySending) return;
    const nextTranscript = [...roleplayTranscript, { role: 'user', text }];
    setRoleplayTranscript(nextTranscript);
    setRoleplayInput(''); setTranscript('');
    setRoleplaySending(true);
    try {
      const res = await fetch('/api/roleplay/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeLabel: trackLabel(profile.current_track), premise: roleplayPremise, transcript: nextTranscript }),
      });
      const data = await res.json();
      setRoleplayTranscript((prev) => [...prev, { role: 'ai', text: data.reply }]);
      setRoleplayDone(!!data.done);
    } catch {
      setError('Sem conexão agora. Tente de novo.');
    }
    setRoleplaySending(false);
  };

  const finishRoleplay = async () => {
    setRoleplayFinishing(true);
    try {
      const res = await fetch('/api/roleplay/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeLabel: trackLabel(profile.current_track), transcript: roleplayTranscript }),
      });
      const data = await res.json();
      if (data.createdItems?.length) {
        setLedger((prev) => {
          const mapped = data.createdItems.map(mapLedgerItem);
          const ids = new Set(mapped.map((m) => m.id));
          return [...mapped, ...prev.filter((it) => !ids.has(it.id))];
        });
      }
      setRoleplayResult({ resumo: data.resumo, createdCount: data.createdItems?.length || 0 });
      router.refresh();
    } catch {
      setRoleplayResult({ resumo: 'Não consegui avaliar agora.', createdCount: 0 });
    }
    setRoleplayFinishing(false);
  };

  const closeRoleplay = () => {
    setRoleplayTranscript([]); setRoleplayPremise(''); setRoleplayDone(false); setRoleplayResult(null);
    setScreen(originTab);
  };

  const startSnapshot = () => {
    setSnapshotDraft(''); setError('');
    setOriginTab('progress');
    setScreen('snapshot');
  };

  const closeSnapshot = () => {
    setSnapshotDraft('');
    setScreen(originTab);
  };

  const submitSnapshot = async () => {
    const text = snapshotDraft.trim();
    if (!text) {
      setError('Escreva sua resposta antes de continuar.');
      return;
    }
    setError('');
    setSnapshotSaving(true);
    try {
      const res = await fetch('/api/snapshot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.snapshot) {
        setNewestSnapshot(data.snapshot);
        if (!oldestSnapshot) setOldestSnapshot(data.snapshot);
        setSnapshotCount((prev) => prev + 1);
        setSnapshotDue(false);
      }
      setScreen(originTab);
    } catch {
      setError('Não consegui salvar agora. Tente de novo.');
    }
    setSnapshotSaving(false);
  };

  const submitAnswer = async (skill) => {
    const text = skill === 'speaking' ? (transcript || speakTyped).trim() : draft.trim();
    if (!text) {
      setError(skill === 'speaking' ? 'Fale ou digite sua resposta primeiro.' : 'Escreva sua resposta primeiro.');
      return;
    }
    if (!activeQueueItem) return;

    setLoading(true);
    setError('');

    const payload = {
      skill,
      task: activeQueueItem.scenario,
      userText: text,
      restriction: activeQueueItem.restriction,
      reviewItemId: activeQueueItem.reviewItemId,
      isBoss: queueKind === 'boss',
      track: profile.current_track,
      stage: profile.current_stage,
    };

    try {
      const res = await fetch('/api/exercise/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('submit_failed');
      const data = await res.json();
      if (data.masteryEvent) {
        setSessionMasteryEvents((prev) => [...prev, data.masteryEvent]);
      }

      // §5 (correction_timing="end_of_exercise"): não mostra a correção agora
      // — acumula e segue direto pro próximo item. A reescrita continua
      // obrigatória, só que revisada em sequência no fim da sessão.
      if (profile.correction_timing === 'end_of_exercise') {
        deferredResultsRef.current = [
          ...deferredResultsRef.current,
          {
            correction: data.correction,
            reviewItem: data.reviewItem,
            skill,
            text,
            attemptId: data.attemptId,
            isReview: activeQueueItem?.kind === 'review',
            restriction: activeQueueItem?.restriction || null,
          },
        ];
        setDeferredTotal(deferredResultsRef.current.length);
        if (data.reviewItem) {
          const mapped = mapLedgerItem(data.reviewItem);
          setLedger((prev) => {
            const exists = prev.some((it) => it.id === mapped.id);
            return exists ? prev.map((it) => (it.id === mapped.id ? mapped : it)) : [mapped, ...prev];
          });
        }
        setLoading(false);
        setDraft(''); setTranscript(''); setSpeakTyped('');
        router.refresh();
        advanceQueue({ silent: true });
        return;
      }

      finalizeResult(data.correction, data.reviewItem, skill, text, data.attemptId);
    } catch {
      finalizeResult(
        {
          veredito: 'erro',
          problemas: [],
          versao_natural: '',
          porque: 'Sem conexão com o servidor agora. Tente de novo.',
          exemplo_analogo: '',
          restricao_cumprida: false,
        },
        null,
        skill,
        text,
        null,
      );
    }
  };

  const advanceQueue = ({ silent = false } = {}) => {
    if (!queue) return;
    const nextIndex = queueIndex + 1;
    recordModeRef.current = 'original';
    if (!silent) {
      setDraft(''); setTranscript(''); setSpeakTyped(''); setError(''); setResult(null);
      setRewriteText(''); setRewriteResult(null);
    }

    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      if (queueKind === 'session') saveStoredSession({ date: getTodayKey(), queue, index: nextIndex });
      setScreen(queue[nextIndex].skill === 'speaking' ? 'speak' : 'write');
      return;
    }

    setQueueIndex(nextIndex);
    if (queueKind === 'session') {
      saveStoredSession({ date: getTodayKey(), queue, index: nextIndex });
    } else {
      setQueue(null); setQueueKind(null); setQueueIndex(0);
    }

    // §5 (correction_timing="end_of_exercise"): sessão acabou sem mostrar
    // nenhuma correção ainda — agora revisa as acumuladas, uma a uma.
    if (deferredResultsRef.current.length > 0) {
      setDeferredIndex(0);
      showDeferredResult(0);
      return;
    }

    // Feedback nomeado (§1): mostrado à parte, depois da sessão completa —
    // nunca misturado com a correção frase a frase.
    if (sessionMasteryEvents.length > 0) {
      setScreen('mastery');
      return;
    }
    setScreen(originTab);
  };

  const showDeferredResult = (idx) => {
    const item = deferredResultsRef.current[idx];
    if (!item) {
      deferredResultsRef.current = [];
      setDeferredTotal(0);
      setDeferredIndex(null);
      if (sessionMasteryEvents.length > 0) { setScreen('mastery'); return; }
      setScreen(originTab);
      return;
    }
    setResult({
      ...item.correction,
      original: item.text,
      skill: item.skill,
      attemptId: item.attemptId,
      stage: item.reviewItem ? item.reviewItem.stage : null,
      mastered: item.reviewItem ? item.reviewItem.mastered : false,
      isReview: item.isReview,
      restriction: item.restriction,
      reinforcePattern: item.reviewItem?.pattern || item.correction.erro_ledger?.pattern || '',
      reinforceCategoria: item.reviewItem?.content?.categoria || item.correction.erro_ledger?.categoria || '',
      reinforceFormaNatural: item.reviewItem?.content?.forma_natural || item.correction.erro_ledger?.forma_natural || '',
    });
    setRewriteText(''); setRewriteResult(null);
    setScreen('result');
  };

  const advanceDeferred = () => {
    const nextIdx = (deferredIndex ?? 0) + 1;
    recordModeRef.current = 'original';
    setResult(null);
    setDeferredIndex(nextIdx);
    showDeferredResult(nextIdx);
  };

  const closeMasteryRecap = () => {
    setSessionMasteryEvents([]);
    setRecallGuesses({}); setRecallResults({}); setRecallRevealed({});
    setScreen(originTab);
  };

  const submitRecallGuess = async (eventId, recall) => {
    const guess = (recallGuesses[eventId] || '').trim();
    if (!guess) return;
    setRecallSubmitting(eventId);
    try {
      const res = await fetch('/api/exercise/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewItemId: recall.reviewItemId, guess, porque: recall.porque }),
      });
      const data = await res.json();
      setRecallResults((prev) => ({ ...prev, [eventId]: data }));
    } catch {
      setRecallResults((prev) => ({ ...prev, [eventId]: { comentario: 'Sem conexão agora.' } }));
    }
    setRecallRevealed((prev) => ({ ...prev, [eventId]: true }));
    setRecallSubmitting(null);
  };

  const skipRecall = (eventId) => {
    setRecallRevealed((prev) => ({ ...prev, [eventId]: true }));
  };

  const redoAttempt = () => {
    if (recording) recognition?.stop();
    recordModeRef.current = 'original';
    setError(''); setResult(null);
    setRewriteText(''); setRewriteResult(null);
    if (result?.skill === 'speaking') { setTranscript(''); setSpeakTyped(''); }
    else { setDraft(''); }
    setScreen(result?.skill === 'speaking' ? 'speak' : 'write');
  };

  const skipSpeaking = () => {
    if (recording) recognition?.stop();
    setError(''); setRecording(false);
    advanceQueue();
  };

  const speakText = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text) {
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

  const activeScenario = activeQueueItem?.scenario;
  const showTabs = ['home', 'mapa', 'progress'].includes(screen);

  const badgeConfig = (correction) => {
    if (!correction) return { icon: '!', cls: 'warn', label: '' };
    if (correction.veredito === 'correto') return { icon: '✓', cls: 'ok', label: 'Perfeito — soou natural' };
    if (correction.veredito === 'nao_natural') return { icon: '~', cls: 'amber', label: 'Entendível, mas soa não natural' };
    const n = correction.problemas?.length || 0;
    return { icon: '!', cls: 'warn', label: n ? `Quase lá — ${n} ajuste${n > 1 ? 's' : ''}` : 'Precisa reescrever' };
  };

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
                  <div className="streak-pill" title="semanas em cadência">
                    <span className="dot" />
                    <strong>{cadenceStreak}</strong>
                    <span>sem.</span>
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
                  <SessionRing completed={displayCompleted} total={displayQueue.length} />
                  <div className="session-info">
                    <span className="session-meta">SESSÃO DE HOJE · {trackLabel(profile.current_track)}</span>
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
                  {upcomingLedger.length === 0 ? (
                    <div className="empty-state">Seus erros viram itens aqui e voltam na hora certa.</div>
                  ) : upcomingLedger.map((item) => (
                    <button key={item.id} className="review-row" onClick={() => openLedgerReview(item)}>
                      <div>
                        <strong>{item.pattern}</strong>
                        <span>{item.dica || item.categoria}</span>
                      </div>
                      <span className="review-tag">{dueLabel(item, Date.now())}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {screen === 'mapa' && (
            <section className="screen home-screen">
              <div className="topbar">
                <div>
                  <div className="logo">cadence</div>
                  <p className="greeting">Mapa de Lacunas</p>
                </div>
              </div>

              <div className="map-filters">
                {['all', 'writing', 'speaking'].map((f) => (
                  <button key={f} className={`map-filter-btn ${mapSkillFilter === f ? 'active' : ''}`} onClick={() => setMapSkillFilter(f)}>
                    {f === 'all' ? 'Tudo' : f === 'writing' ? 'Escrita' : 'Fala'}
                  </button>
                ))}
                {['all', 'ativo', 'em_revisao', 'dominado'].map((f) => (
                  <button key={f} className={`map-filter-btn ${mapStatusFilter === f ? 'active' : ''}`} onClick={() => setMapStatusFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'ativo' ? 'Ativos' : f === 'em_revisao' ? 'Em revisão' : 'Dominados'}
                  </button>
                ))}
              </div>

              {expandedLedgerId && (() => {
                const item = ledger.find((it) => it.id === expandedLedgerId);
                if (!item) return null;
                return (
                  <div className="ledger-detail">
                    <button className="ledger-detail-close" onClick={() => setExpandedLedgerId(null)}>fechar ✕</button>
                    <span className="result-label">{item.categoria} · {item.skill === 'speaking' ? 'fala' : 'escrita'}</span>
                    <strong>{item.pattern}</strong>
                    {item.exemplos?.[0] && <p style={{ margin: 0, color: 'var(--error)', textDecoration: 'line-through' }}>{item.exemplos[0]}</p>}
                    <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 700 }}>{item.formaNatural}</p>
                    <p style={{ margin: 0, color: '#575b41' }}>{item.porque}</p>
                    <span className="pill">{ledgerStatus(item)} · {item.timesCorrect}/{item.timesSeen} acertos</span>
                  </div>
                );
              })()}

              <div className="ledger-grid">
                {filteredLedger.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Nenhum item aqui ainda — faça uma sessão pra popular seu mapa.</div>
                ) : filteredLedger.map((item) => {
                  const status = ledgerStatus(item);
                  return (
                    <button key={item.id} className={`ledger-node ${status}`} onClick={() => setExpandedLedgerId(item.id === expandedLedgerId ? null : item.id)}>
                      <span className="ledger-node-cat">{item.categoria || item.skill}</span>
                      <span className="ledger-node-pattern">{item.pattern}</span>
                      <span className="ledger-node-rate">{status === 'dominado' ? 'dominado' : `${Math.round(item.taxaErro * 100)}% erro recente`}</span>
                    </button>
                  );
                })}
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
                  <strong>{cadenceStreak}</strong>
                  <span>semanas em cadência</span>
                </div>
                <div className="stat-card">
                  <strong>{masteredCount}</strong>
                  <span>itens dominados</span>
                </div>
              </div>

              <div className="chart-card">
                <h4>Cadência semanal · meta {profile.weekly_cadence_target}/sem</h4>
                <div className="session-top">
                  <SessionRing completed={currentWeek.sessions} total={profile.weekly_cadence_target} />
                  <div className="session-info">
                    <span className="session-meta">ESSA SEMANA</span>
                    <span className="session-title">{currentWeek.sessions} de {profile.weekly_cadence_target} sessões</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h4>Patentes</h4>
                <div className="level-row">
                  <div className="level-card">
                    <span className="level-tag">{writingPatent}</span>
                    <span>Escrita</span>
                  </div>
                  <div className="level-card">
                    <span className="level-tag">{speakingPatent}</span>
                    <span>Fala</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h4>Mapa de progresso</h4>
                <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12.5, color: '#7d806f' }}>
                  Sem roteiro fixo — a ordem depende dos seus erros reais, não de um currículo.
                </p>
                {topicProgress.length === 0 ? (
                  <div className="empty-state">Seus temas aparecem aqui depois da primeira sessão.</div>
                ) : (
                  <>
                    <span className="sub-label" style={{ display: 'block', marginBottom: 6 }}>VOCÊ JÁ DOMINA</span>
                    {masteredTopics.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#a3a68f', marginTop: 0 }}>Ainda nenhum tema totalmente dominado.</p>
                    ) : masteredTopics.map((t) => (
                      <div className="review-row" key={t.categoria} style={{ cursor: 'default' }}>
                        <div><strong>{t.categoria}</strong><span>{t.mastered} padrão(ões) dominado(s)</span></div>
                      </div>
                    ))}
                    <span className="sub-label" style={{ display: 'block', margin: '14px 0 6px' }}>SENDO TRABALHADO AGORA</span>
                    {inProgressTopics.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#a3a68f', marginTop: 0 }}>Nada em aberto agora.</p>
                    ) : inProgressTopics.map((t) => (
                      <div className="review-row" key={t.categoria} style={{ cursor: 'default' }}>
                        <div><strong>{t.categoria}</strong><span>{t.active} erro(s) ativo(s)</span></div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="chart-card">
                <h4>Trilha atual · {trackLabel(profile.current_track)}, estágio {profile.current_stage}</h4>
                {bossAvailable.writing && (
                  <button className="boss-btn" style={{ marginBottom: 8, width: '100%' }} onClick={() => startBoss('writing')} disabled={bossDoneThisStage}>
                    {bossDoneThisStage ? 'Desafio de escrita vencido ✓' : 'Desafio do estágio — escrita'}
                  </button>
                )}
                {bossAvailable.speaking && (
                  <button className="boss-btn" style={{ width: '100%' }} onClick={() => startBoss('speaking')} disabled={bossDoneThisStage}>
                    {bossDoneThisStage ? 'Desafio de fala vencido ✓' : 'Desafio do estágio — fala'}
                  </button>
                )}
              </div>

              <div className="chart-card">
                <h4>Temas extras</h4>
                <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12.5, color: '#7d806f' }}>
                  Até {MAX_EXTRA_THEMES} temas além de {trackLabel(profile.current_track)} — só ampliam de onde vem o conteúdo novo, sem afetar seu estágio atual.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TRACKS.filter((t) => t.id !== profile.current_track).map((t) => {
                    const selected = themeSelection.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        className={`nav-btn ${selected ? 'active' : ''}`}
                        style={{ border: '1px solid #ece8dc', borderRadius: 20, padding: '8px 14px', flex: 'none' }}
                        onClick={() => toggleTheme(t.id)}
                        disabled={savingThemes || (!selected && themeSelection.length >= MAX_EXTRA_THEMES)}
                      >
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="chart-card">
                <h4>Roleplay</h4>
                <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12.5, color: '#7d806f' }}>
                  Uma troca curta em inglês dentro de {trackLabel(profile.current_track)} — correção só no final, não interrompe a conversa. Complementa a sessão do dia, não substitui.
                </p>
                <button className="submit-btn ready" onClick={startRoleplay}>Praticar roleplay agora</button>
              </div>

              {snapshotCount < 2 ? (
                snapshotDue && (
                  <div className="chart-card">
                    <h4>Antes e depois</h4>
                    <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12.5, color: '#7d806f' }}>
                      {snapshotCount === 0
                        ? 'Responda a mesma pergunta do início — isso vira o "antes" da sua evolução.'
                        : 'Hora de responder de novo — isso vira o "depois" pra comparar com o início.'}
                    </p>
                    <button className="submit-btn ready" onClick={startSnapshot}>Responder agora</button>
                  </div>
                )
              ) : (
                <div className="chart-card">
                  <h4>Antes e depois</h4>
                  <p style={{ marginTop: 0, marginBottom: 12, fontSize: 12.5, color: '#7d806f' }}>
                    Sua própria produção, lado a lado — a prova mais concreta de evolução.
                  </p>
                  <span className="result-label">ANTES · {new Date(oldestSnapshot.created_at).toLocaleDateString('pt-BR')}</span>
                  <p style={{ fontSize: 14, marginTop: 4, marginBottom: 10 }}>{oldestSnapshot.response_text}</p>
                  {oldestSnapshot.errors_then?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {oldestSnapshot.errors_then.map((err, idx) => {
                        const resolved = !(newestSnapshot.errors_then || []).some((e) => e.pattern === err.pattern);
                        return (
                          <p key={idx} style={{ fontSize: 12.5, margin: '2px 0', color: resolved ? '#8a9a7a' : '#a3564a' }}>
                            {resolved ? '✓ resolvido — ' : '! ainda aparece — '}
                            <span style={{ textDecoration: resolved ? 'line-through' : 'none' }}>{err.pattern}</span>
                          </p>
                        );
                      })}
                    </div>
                  )}
                  <span className="result-label">DEPOIS · {new Date(newestSnapshot.created_at).toLocaleDateString('pt-BR')}</span>
                  <p style={{ fontSize: 14, marginTop: 4 }}>{newestSnapshot.response_text}</p>
                  {snapshotDue && (
                    <button className="submit-btn ready" style={{ marginTop: 12 }} onClick={startSnapshot}>Responder de novo</button>
                  )}
                </div>
              )}

              <div className="chart-card">
                <h4>Sessões nos últimos 7 dias</h4>
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

              <div className="chart-card">
                <h4>Preferências de correção</h4>
                <p style={{ marginTop: 0, marginBottom: 10, fontSize: 12.5, color: '#7d806f' }}>QUANDO CORRIGIR</p>
                <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button
                    className={`nav-btn ${profile.correction_timing !== 'end_of_exercise' ? 'active' : ''}`}
                    style={{ flex: 1, border: '1px solid #ece8dc', borderRadius: 8 }}
                    onClick={() => updatePreference('correction_timing', 'inline')}
                    disabled={savingPrefs}
                  >
                    <span>Durante o exercício</span>
                  </button>
                  <button
                    className={`nav-btn ${profile.correction_timing === 'end_of_exercise' ? 'active' : ''}`}
                    style={{ flex: 1, border: '1px solid #ece8dc', borderRadius: 8 }}
                    onClick={() => updatePreference('correction_timing', 'end_of_exercise')}
                    disabled={savingPrefs}
                  >
                    <span>Só no final</span>
                  </button>
                </div>
                <p style={{ marginTop: 0, marginBottom: 10, fontSize: 12.5, color: '#7d806f' }}>PROFUNDIDADE</p>
                <div className="tabs" style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`nav-btn ${profile.correction_depth !== 'flag_only' ? 'active' : ''}`}
                    style={{ flex: 1, border: '1px solid #ece8dc', borderRadius: 8 }}
                    onClick={() => updatePreference('correction_depth', 'explain_always')}
                    disabled={savingPrefs}
                  >
                    <span>Sempre explicar</span>
                  </button>
                  <button
                    className={`nav-btn ${profile.correction_depth === 'flag_only' ? 'active' : ''}`}
                    style={{ flex: 1, border: '1px solid #ece8dc', borderRadius: 8 }}
                    onClick={() => updatePreference('correction_depth', 'flag_only')}
                    disabled={savingPrefs}
                  >
                    <span>Só apontar</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {(screen === 'write' || screen === 'speak') && activeScenario && (
            <section className={`screen ${screen === 'speak' ? 'dark-screen' : ''}`}>
              <div className="sub-header">
                <button className="back-btn" onClick={resetView}>←</button>
                <span className="sub-label">{screen === 'speak' ? 'FALA' : 'ESCRITA'}{queueKind === 'boss' ? ' · DESAFIO' : ''}</span>
                {queue && queueKind !== 'boss' && <span className="sub-count">{queueIndex + 1}/{queue.length}</span>}
              </div>
              {queue && queueKind !== 'boss' && (
                <div className="session-progress-track">
                  <div className="session-progress-fill" style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }} />
                </div>
              )}

              <div className="scenario-box">
                <h2>{activeScenario.label}</h2>
                <p>{activeScenario.context}</p>
                <small>{activeScenario.askPt}</small>
                {activeQueueItem?.restriction && (
                  <div className="scenario-meta">
                    <span className="restriction-chip">use: {activeQueueItem.restriction.structureHint}</span>
                  </div>
                )}
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
                  <button className={`submit-btn ${draft.trim() ? 'ready' : ''}`} onClick={() => submitAnswer('writing')} disabled={loading}>
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
                  <div className="footer-actions">
                    <button className="ghost-btn dark" onClick={skipSpeaking} disabled={loading}>
                      Agora não consigo falar
                    </button>
                    <button className="submit-btn accent" style={{ flex: 1 }} onClick={() => submitAnswer('speaking')} disabled={loading || (!transcript && !speakTyped)}>
                      {loading ? 'Corrigindo…' : 'Verificar'}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {screen === 'result' && result && (
            <section className="screen result-screen">
              <div className="sub-header">
                <button className="back-btn" onClick={resetView}>←</button>
                <span className="sub-label">{result.skill === 'speaking' ? 'FALA · CORREÇÃO' : 'ESCRITA · CORREÇÃO'}</span>
                {deferredIndex !== null && <span className="sub-count">{deferredIndex + 1}/{deferredTotal}</span>}
              </div>

              {(() => {
                const badge = badgeConfig(result);
                return (
                  <div className="result-badge">
                    <span className={`badge-icon ${badge.cls}`}>{badge.icon}</span>
                    <strong>{badge.label}</strong>
                  </div>
                );
              })()}

              <div className="result-card">
                <span className="result-label">{result.skill === 'speaking' ? 'VOCÊ FALOU' : 'VOCÊ ESCREVEU'}</span>
                <HighlightedAnswer userText={result.original} problemas={result.problemas} veredito={result.veredito} />
              </div>

              {result.versao_natural && (
                <div className="result-card accent">
                  <div className="result-row">
                    <span className="result-label">VERSÃO NATURAL</span>
                    <button className="play-btn" onClick={() => speakText(result.versao_natural)}>▷ ouvir</button>
                  </div>
                  <p>{result.versao_natural}</p>
                </div>
              )}

              {result.porque && (
                <div className="insight-box">
                  <strong>Por quê:</strong>
                  <p>{result.porque}</p>
                </div>
              )}

              {!result.porque && result.veredito !== 'correto' && (
                <button className="ghost-btn" onClick={requestExplanation} disabled={explainLoading}>
                  {explainLoading ? 'Gerando…' : 'Por quê?'}
                </button>
              )}

              {result.veredito !== 'correto' && (
                <>
                  {result.exemplo_analogo && (
                    <div className="insight-box muted">
                      <strong>Mesmo padrão, outro contexto:</strong>
                      <p>{result.exemplo_analogo}</p>
                    </div>
                  )}

                  <div className="result-card">
                    <span className="result-label">
                      {result.skill === 'speaking' ? 'AGORA REFALE A VERSÃO CORRIGIDA' : 'AGORA REESCREVA A FRASE CORRIGIDA'}
                    </span>
                    {result.skill === 'speaking' && speechSupported ? (
                      <div style={{ textAlign: 'center', margin: '14px 0' }}>
                        <button className={`mic-btn ${recording ? 'recording' : ''}`} onClick={toggleRewriteRec}>
                          <span className="mic-inner" />
                        </button>
                        <div className="mic-caption">{recording ? 'toque para parar' : 'toque para refalar'}</div>
                        {rewriteText && <p style={{ marginTop: 10, fontSize: 14 }}>{rewriteText}</p>}
                      </div>
                    ) : (
                      <textarea
                        className="input-area compact"
                        placeholder={result.skill === 'speaking' ? 'Digite o que você diria…' : 'Reescreva aqui aplicando a correção…'}
                        value={rewriteText}
                        onChange={(e) => { setRewriteText(e.target.value); setRewriteResult(null); }}
                      />
                    )}
                    <button className="submit-btn ready" style={{ marginTop: 10 }} onClick={verifyRewrite} disabled={rewriteLoading || !rewriteText.trim()}>
                      {rewriteLoading ? 'Verificando…' : 'Verificar reescrita'}
                    </button>
                    {rewriteResult && (
                      <div className={`insight-box ${rewriteResult.corrigido ? '' : 'muted'}`} style={{ marginTop: 10 }}>
                        <strong>{rewriteResult.corrigido ? '✓ Corrigido' : 'Ainda não'}</strong>
                        <p>{rewriteResult.comentario}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {rewriteResult && drillsLoading && (
                <p style={{ fontSize: 12.5, color: '#a3a68f' }}>Preparando mais um pouco desse padrão…</p>
              )}

              {rewriteResult && drills && drills.length > 0 && (
                <div className="result-card">
                  <span className="result-label">MAIS UM POUCO DESSE PADRÃO</span>
                  {drills.map((drill, idx) => (
                    <div key={idx} style={{ marginTop: idx === 0 ? 10 : 18 }}>
                      <p style={{ fontSize: 14, marginBottom: 6 }}>{drill.prompt}</p>
                      <p className="hint" style={{ marginTop: 0, marginBottom: 8 }}>{drill.hint}</p>
                      <textarea
                        className="input-area compact"
                        placeholder="responda em inglês…"
                        value={drillAnswers[idx] || ''}
                        onChange={(e) => setDrillAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                      />
                      <button
                        className="submit-btn ready"
                        style={{ marginTop: 8 }}
                        onClick={() => checkDrill(idx)}
                        disabled={drillChecking === idx || !(drillAnswers[idx] || '').trim()}
                      >
                        {drillChecking === idx ? 'Verificando…' : 'Verificar'}
                      </button>
                      {drillResults[idx] && (
                        <div className={`insight-box ${drillResults[idx].corrigido ? '' : 'muted'}`} style={{ marginTop: 8 }}>
                          <strong>{drillResults[idx].corrigido ? '✓ Boa' : 'Quase'}</strong>
                          <p>{drillResults[idx].comentario}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.restriction && !result.restricao_cumprida && (
                <div className="insight-box muted">
                  <strong>Quase lá:</strong>
                  <p>Tenta a mesma ideia usando: {result.restriction.structureHint}</p>
                </div>
              )}

              {result.isReview && result.stage !== null && (
                <ReviewPipeline stage={result.stage} mastered={result.mastered} />
              )}

              <div className="footer-actions">
                {result.skill === 'speaking' && deferredIndex === null && (
                  <button className="icon-btn" onClick={redoAttempt} title="Tentar de novo">↺</button>
                )}
                <button
                  className="submit-btn ready"
                  style={{ flex: 1 }}
                  onClick={deferredIndex !== null ? advanceDeferred : advanceQueue}
                  disabled={result.veredito !== 'correto' && !rewriteResult}
                  title={result.veredito !== 'correto' && !rewriteResult ? 'Verifique sua reescrita antes de continuar' : undefined}
                >
                  {deferredIndex !== null ? (deferredIndex + 1 < deferredTotal ? 'Próximo' : 'Concluir sessão') : queueButtonLabel}
                </button>
              </div>
            </section>
          )}

          {screen === 'mastery' && (
            <section className="screen result-screen">
              <div className="sub-header">
                <span className="sub-label">SESSÃO CONCLUÍDA</span>
              </div>
              <div className="login-hero">
                <h1>Isso você já domina de verdade.</h1>
                <p>Padrões que você acertou de forma consistente na revisão espaçada e não voltam mais.</p>
              </div>
              {sessionMasteryEvents.map((event) => {
                const needsRecall = !!event.recall && !recallRevealed[event.id];
                return (
                  <div className="result-card accent" key={event.id}>
                    {needsRecall ? (
                      <>
                        <span className="result-label">ANTES DE CONTAR — POR QUE VOCÊ ACHA QUE É ASSIM?</span>
                        <textarea
                          className="input-area compact"
                          placeholder="tenta explicar com suas palavras…"
                          value={recallGuesses[event.id] || ''}
                          onChange={(e) => setRecallGuesses((prev) => ({ ...prev, [event.id]: e.target.value }))}
                        />
                        <div className="footer-actions" style={{ marginTop: 8 }}>
                          <button className="ghost-btn" onClick={() => skipRecall(event.id)}>Só me mostra</button>
                          <button
                            className="submit-btn ready"
                            style={{ flex: 1 }}
                            onClick={() => submitRecallGuess(event.id, event.recall)}
                            disabled={recallSubmitting === event.id || !(recallGuesses[event.id] || '').trim()}
                          >
                            {recallSubmitting === event.id ? 'Verificando…' : 'Responder'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {recallResults[event.id] && (
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#575b41' }}>{recallResults[event.id].comentario}</p>
                        )}
                        <p style={{ margin: 0 }}>{event.message}</p>
                      </>
                    )}
                  </div>
                );
              })}
              <button
                className="submit-btn ready"
                onClick={closeMasteryRecap}
                disabled={sessionMasteryEvents.some((event) => !!event.recall && !recallRevealed[event.id])}
              >
                Continuar
              </button>
            </section>
          )}

          {screen === 'roleplay' && (
            <section className="screen dark-screen">
              <div className="sub-header">
                <button className="back-btn" onClick={closeRoleplay}>←</button>
                <span className="sub-label">ROLEPLAY · {trackLabel(profile.current_track).toUpperCase()}</span>
              </div>

              {roleplayPremise && (
                <p style={{ fontSize: 12, color: '#9fa28f', marginBottom: 14 }}>{roleplayPremise}</p>
              )}

              {!roleplayResult ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {roleplayTranscript.map((t, idx) => (
                      <div className={`result-card ${t.role === 'user' ? 'accent' : ''}`} key={idx}>
                        <span className="result-label">{t.role === 'ai' ? 'PERSONAGEM' : 'VOCÊ'}</span>
                        <p>{t.text}</p>
                      </div>
                    ))}
                    {roleplaySending && <p style={{ fontSize: 12, color: '#9fa28f' }}>…</p>}
                  </div>

                  {!roleplayDone ? (
                    <>
                      {speechSupported ? (
                        <>
                          <button className={`mic-btn ${recording ? 'recording' : ''}`} onClick={toggleRec}>
                            <span className="mic-inner" />
                          </button>
                          <div className="mic-caption">{recording ? 'toque para parar' : 'toque para falar'}</div>
                          {transcript && <p style={{ marginTop: 8, fontSize: 14, textAlign: 'center' }}>{transcript}</p>}
                        </>
                      ) : (
                        <textarea
                          className="input-area compact"
                          placeholder="responda em inglês…"
                          value={roleplayInput}
                          onChange={(e) => setRoleplayInput(e.target.value)}
                        />
                      )}
                      {error && <div className="error-box dark">{error}</div>}
                      <button
                        className="submit-btn accent"
                        style={{ marginTop: 10, width: '100%' }}
                        onClick={sendRoleplayTurn}
                        disabled={roleplaySending || !(transcript || roleplayInput).trim()}
                      >
                        {roleplaySending ? 'Enviando…' : 'Responder'}
                      </button>
                    </>
                  ) : (
                    <button className="submit-btn ready" style={{ width: '100%' }} onClick={finishRoleplay} disabled={roleplayFinishing}>
                      {roleplayFinishing ? 'Avaliando…' : 'Encerrar e ver avaliação'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="result-card accent">
                    <span className="result-label">COMO FOI</span>
                    <p>{roleplayResult.resumo}</p>
                  </div>
                  {roleplayResult.createdCount > 0 && (
                    <p style={{ fontSize: 13, color: '#9fa28f', marginTop: 10 }}>
                      {roleplayResult.createdCount} padrão(ões) identificado(s) entraram na sua revisão espaçada.
                    </p>
                  )}
                  <button className="submit-btn ready" style={{ width: '100%', marginTop: 14 }} onClick={closeRoleplay}>Voltar</button>
                </>
              )}
            </section>
          )}

          {screen === 'snapshot' && (
            <section className="screen">
              <div className="sub-header">
                <button className="back-btn" onClick={closeSnapshot}>←</button>
                <span className="sub-label">ANTES E DEPOIS</span>
              </div>
              <div className="scenario-box">
                <h2>ANTES DE COMEÇAR</h2>
                <p>Conte rapidinho: o que você fez ontem?</p>
                <small>Escreva 1-2 frases curtas em inglês.</small>
              </div>
              <div className="input-wrap">
                <textarea
                  className="input-area"
                  placeholder="Escreva em inglês…"
                  value={snapshotDraft}
                  onChange={(e) => setSnapshotDraft(e.target.value)}
                />
              </div>
              {error && <div className="error-box">{error}</div>}
              <button className={`submit-btn ${snapshotDraft.trim() ? 'ready' : ''}`} onClick={submitSnapshot} disabled={snapshotSaving}>
                {snapshotSaving ? 'Salvando…' : 'Salvar'}
              </button>
            </section>
          )}
        </div>

        {showTabs && (
          <nav className="bottom-nav">
            <button className={`nav-btn ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
              <IconHome />
              <span>Hoje</span>
            </button>
            <button className={`nav-btn ${screen === 'mapa' ? 'active' : ''}`} onClick={() => setScreen('mapa')}>
              <IconMap />
              <span>Mapa</span>
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
