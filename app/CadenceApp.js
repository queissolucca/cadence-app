'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { mapLedgerItem, ledgerStatus } from '../lib/ledger';
import { composeSession } from '../lib/session';
import { getStage, trackLabel } from '../lib/tracks';
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

  const [ledger, setLedger] = useState(() => initialLedger.map(mapLedgerItem));
  const [cadenceWeeks, setCadenceWeeks] = useState(initialCadenceWeeks);
  const [cadenceStreak, setCadenceStreak] = useState(initialCadenceStreak);
  const [weekDays, setWeekDays] = useState(initialWeekDays);
  const [skillProgress, setSkillProgress] = useState(initialSkillProgress);
  const [profile, setProfile] = useState(initialProfile);
  const [stageCompletions, setStageCompletions] = useState(initialStageCompletions);

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

  const sessionPreview = useMemo(
    () => composeSession(ledger, profile.current_track, profile.current_stage),
    [ledger, profile.current_track, profile.current_stage],
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
    setScreen(originTab);
    setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null); setRecording(false);
  };

  const startOrContinueSession = () => {
    if (sessionFinishedToday) return;
    setOriginTab('home');
    if (sessionActive) {
      setError(''); setDraft(''); setTranscript(''); setSpeakTyped(''); setResult(null);
      setScreen(sessionQueue[queueIndex].skill === 'speaking' ? 'speak' : 'write');
      return;
    }
    const freshQueue = composeSession(ledger, profile.current_track, profile.current_stage);
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
      recognition.start();
      setTranscript('');
      setRecording(true);
      setError('');
    } catch {
      setError('Não consegui abrir o microfone.');
    }
  };

  const finalizeResult = (correction, reviewItem, skill, text) => {
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
      stage: reviewItem ? reviewItem.stage : null,
      mastered: reviewItem ? reviewItem.mastered : false,
      isReview: activeQueueItem?.kind === 'review',
      restriction: activeQueueItem?.restriction || null,
    });
    setScreen('result');
    setLoading(false);
    router.refresh();
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
      finalizeResult(data.correction, data.reviewItem, skill, text);
    } catch {
      finalizeResult(
        {
          veredito: 'erro',
          problemas: [],
          versao_natural: '',
          porque: 'Sem conexão com o servidor agora. Tente de novo.',
          restricao_cumprida: false,
        },
        null,
        skill,
        text,
      );
    }
  };

  const advanceQueue = () => {
    if (!queue) return;
    const nextIndex = queueIndex + 1;
    setDraft(''); setTranscript(''); setSpeakTyped(''); setError(''); setResult(null);

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
    setScreen(originTab);
  };

  const redoAttempt = () => {
    setError(''); setResult(null);
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
                {result.skill === 'speaking' && (
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
