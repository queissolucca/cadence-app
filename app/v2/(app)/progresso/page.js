import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/server';
import { weekStartSP, weekEndSP, addDays } from '../../../../lib/dates';
import { bucketReviewItems } from '../../../../lib/srs';
import { computePatentByCount } from '../../../../lib/patents';
import { getBeforeAfterAvailability } from '../../../../lib/beforeAfter';
import { getOrCreateDailyContent } from '../../../../lib/dailyContent';
import { SectionHead } from '../../../../components/ui';
import { PlayButton } from '../../../../components/v2/PlayButton';

function formatShortDate(date) {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

// Verde quando "melhor" (mais é melhor pra todo stat aqui), vermelho
// quando pior, cinza quando não há dado da semana passada pra comparar.
function DeltaPill({ hasPrevious, improved, children }) {
  const bg = !hasPrevious ? 'var(--v2-badge-neutral-bg)' : improved ? 'var(--green-soft)' : 'var(--v2-badge-due-bg)';
  const color = !hasPrevious ? 'var(--ink-soft)' : improved ? 'var(--green-dark)' : 'var(--red)';
  return (
    <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, borderRadius: 999, padding: '3px 9px', background: bg, color, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, delta }) {
  return (
    <div className="v2-card">
      <span style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <p style={{ margin: '6px 0 8px', fontSize: 26, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono-v2)' }}>{value}</p>
      {delta}
    </div>
  );
}

export default async function ProgressoPageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const nowIso = now.toISOString();
  const weekStart = weekStartSP(now);
  const weekEnd = weekEndSP(now);
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekEnd, -7);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const [
    { count: attemptsThisWeek },
    { count: attemptsLastWeek },
    { data: reviewAttemptsThisWeek },
    { data: reviewAttemptsLastWeek },
    { count: masteredThisWeek },
    { count: masteredTotal },
    { data: sessionsThisWeek },
    { data: sessionsLastWeek },
    { count: masteredWritingCount },
    { count: masteredSpeakingCount },
    { data: activeReviewItems },
    { data: recentErrors },
    beforeAfter,
    { data: profile },
    content,
    { data: lastError },
    { data: last3DaysErrors },
    { data: duePhrases },
  ] = await Promise.all([
    supabase.from('exercise_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', weekStart.toISOString()).lte('created_at', weekEnd.toISOString()),
    supabase.from('exercise_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', lastWeekStart.toISOString()).lte('created_at', lastWeekEnd.toISOString()),
    supabase.from('exercise_attempts').select('verdict').eq('user_id', user.id).not('review_item_id', 'is', null).gte('created_at', weekStart.toISOString()).lte('created_at', weekEnd.toISOString()),
    supabase.from('exercise_attempts').select('verdict').eq('user_id', user.id).not('review_item_id', 'is', null).gte('created_at', lastWeekStart.toISOString()).lte('created_at', lastWeekEnd.toISOString()),
    supabase.from('review_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('mastered_at', weekStart.toISOString()).lte('mastered_at', weekEnd.toISOString()),
    supabase.from('review_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('mastered', true),
    supabase.from('sessions').select('duration_seconds').eq('user_id', user.id).gte('started_at', weekStart.toISOString()).lte('started_at', weekEnd.toISOString()),
    supabase.from('sessions').select('duration_seconds').eq('user_id', user.id).gte('started_at', lastWeekStart.toISOString()).lte('started_at', lastWeekEnd.toISOString()),
    supabase.from('review_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('mastered', true).eq('skill', 'writing'),
    supabase.from('review_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('mastered', true).eq('skill', 'speaking'),
    supabase.from('review_items').select('stage, next_review_at, mastered').eq('user_id', user.id).eq('mastered', false),
    supabase.from('error_events').select('category, category_label_pt, detail_pt').eq('user_id', user.id).gte('occurred_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    getBeforeAfterAvailability(supabase, user),
    supabase.from('profiles').select('voice_accent, audio_speed').eq('id', user.id).single(),
    getOrCreateDailyContent(supabase, user).catch(() => ({ phrase_of_day: null, exercises: { writing: [], speaking: [] } })),
    // Sua última correção (erro mais recente) — lê de error_events, não de
    // exercise_attempts, porque error_events é o único log alimentado por
    // TODAS as fontes de erro (sessão diária, pontos fracos E roleplay).
    supabase.from('error_events').select('wrong_text, right_text, detail_pt, occurred_at').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(1).maybeSingle(),
    // Banner "por que revisar hoje" — erros dos últimos 3 dias
    supabase.from('error_events').select('category_label_pt').eq('user_id', user.id).gte('occurred_at', threeDaysAgo),
    // Frases due hoje (máx 8 — telas largas mostram 2 por linha)
    supabase.from('review_items').select('id, pattern, content, next_review_at').eq('user_id', user.id).eq('mastered', false).lte('next_review_at', nowIso).order('next_review_at', { ascending: true }).limit(8),
  ]);

  // Stat 2 — % de acerto na revisão
  const pctCorrect = (rows) => {
    if (!rows?.length) return null;
    const correct = rows.filter((r) => r.verdict === 'correto').length;
    return Math.round((correct / rows.length) * 100);
  };
  const pctThisWeek = pctCorrect(reviewAttemptsThisWeek);
  const pctLastWeek = pctCorrect(reviewAttemptsLastWeek);

  // Stat 4 — minutos de prática
  const minutesThisWeek = Math.round((sessionsThisWeek || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60);
  const minutesLastWeek = Math.round((sessionsLastWeek || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60);

  const hadLastWeek = (attemptsLastWeek || 0) > 0 || (sessionsLastWeek || []).length > 0 || pctLastWeek !== null;

  // Patentes
  const writingPatent = computePatentByCount(masteredWritingCount || 0);
  const speakingPatent = computePatentByCount(masteredSpeakingCount || 0);

  // Memória espaçada
  const buckets = bucketReviewItems(activeReviewItems || []);
  const activeTotal = buckets.hoje + buckets.amanha + buckets.semana + buckets.mes;
  const maxBucket = Math.max(1, buckets.hoje, buckets.amanha, buckets.semana, buckets.mes);

  // Onde você mais errou
  const categoryAgg = {};
  (recentErrors || []).forEach((e) => {
    if (!categoryAgg[e.category]) categoryAgg[e.category] = { label: e.category_label_pt || e.category, detail: e.detail_pt, count: 0 };
    categoryAgg[e.category].count += 1;
  });
  const topErrors = Object.values(categoryAgg).sort((a, b) => b.count - a.count).slice(0, 3);

  // Antes e depois — Etapa 10, agora contra before_after_checks (não mais
  // progress_snapshots, que é do fluxo antigo, ver migration 0009).
  const nextComparisonDue = !beforeAfter.available;
  const nextComparisonDate = beforeAfter.nextDate ? formatShortDate(new Date(beforeAfter.nextDate)) : null;

  // Suas frases — banner "por que revisar hoje" com base nos últimos 3 dias
  let topErrorBanner = null;
  if (last3DaysErrors?.length) {
    const counts = {};
    last3DaysErrors.forEach((e) => { counts[e.category_label_pt] = (counts[e.category_label_pt] || 0) + 1; });
    const [label, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    topErrorBanner = { label, count };
  }

  let nextReviewDate = null;
  if (!duePhrases?.length) {
    const { data: nextItem } = await supabase
      .from('review_items')
      .select('next_review_at')
      .eq('user_id', user.id)
      .eq('mastered', false)
      .gt('next_review_at', nowIso)
      .order('next_review_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    nextReviewDate = nextItem?.next_review_at ? new Date(nextItem.next_review_at).toLocaleDateString('pt-BR') : null;
  }

  const accent = profile?.voice_accent || 'us';
  const rate = profile?.audio_speed || 1.0;

  return (
    <>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)' }}>
          Semana de {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
        </p>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>Progresso</h1>
      </div>

      {/* 2 colunas em telas estreitas, 4 em telas largas */}
      <div className="web-grid-4">
        <StatCard
          label="Frases praticadas"
          value={attemptsThisWeek || 0}
          delta={
            <DeltaPill hasPrevious={hadLastWeek} improved={(attemptsThisWeek || 0) >= (attemptsLastWeek || 0)}>
              {hadLastWeek ? `${(attemptsThisWeek || 0) - (attemptsLastWeek || 0) >= 0 ? '↑ +' : '↓ '}${Math.abs((attemptsThisWeek || 0) - (attemptsLastWeek || 0))} vs semana passada` : 'primeira semana'}
            </DeltaPill>
          }
        />
        <StatCard
          label="Acerto na revisão"
          value={pctThisWeek !== null ? `${pctThisWeek}%` : '—'}
          delta={
            <DeltaPill hasPrevious={pctLastWeek !== null} improved={pctThisWeek !== null && pctLastWeek !== null && pctThisWeek >= pctLastWeek}>
              {pctLastWeek !== null ? `semana passada: ${pctLastWeek}%` : 'primeira semana'}
            </DeltaPill>
          }
        />
        <StatCard
          label="Dominadas na semana"
          value={masteredThisWeek || 0}
          delta={<DeltaPill hasPrevious improved>{masteredTotal || 0} no total</DeltaPill>}
        />
        <StatCard
          label="Minutos de prática"
          value={minutesThisWeek}
          delta={
            <DeltaPill hasPrevious={hadLastWeek} improved={minutesThisWeek >= minutesLastWeek}>
              {hadLastWeek ? `semana passada: ${minutesLastWeek} min` : 'primeira semana'}
            </DeltaPill>
          }
        />
      </div>

      {/* Suas frases pra revisar numa coluna, frase do dia/última correção
          fixas do lado (desktop); mobile empilha tudo (padrão do web-cols
          abaixo de 900px) */}
      <div className="web-cols">
        <div>
          <div className="v2-section-head" style={{ marginBottom: 12 }}>
            <h2>Suas frases</h2>
            <span className="v2-section-right">{duePhrases?.length || 0} para hoje</span>
          </div>

          {(topErrorBanner || duePhrases?.length > 0) && (
            <div style={{ background: 'var(--green-soft)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
              {topErrorBanner ? (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>
                  Você errou <strong style={{ color: 'var(--green-dark)' }}>{topErrorBanner.label}</strong> {topErrorBanner.count}x nos últimos 3 dias — as frases abaixo treinam exatamente isso.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)' }}>
                  Nenhum erro nos últimos 3 dias — você está indo muito bem! Revise as frases abaixo para fixar de vez.
                </p>
              )}
            </div>
          )}

          {duePhrases?.length ? (
            <div className="web-grid-2">
              {duePhrases.map((item) => (
                <div key={item.id} className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.content?.forma_natural || item.pattern}
                    </strong>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.content?.dica || item.content?.categoria || ''}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 10.5, background: 'var(--green-soft)', color: 'var(--green-dark)', borderRadius: 999, padding: '3px 8px', flexShrink: 0 }}>hoje</span>
                  <PlayButton
                    text={item.content?.forma_natural || item.pattern}
                    accent={accent}
                    rate={rate}
                    label="▶"
                    style={{ background: 'var(--green-soft)', color: 'var(--green-dark)' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="v2-card" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                Tudo em dia{nextReviewDate ? ` — próxima revisão ${nextReviewDate}` : ''}.
              </p>
            </div>
          )}
        </div>

        <div className="web-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {content.phrase_of_day && (
            <div className="v2-card-dark">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Frase do dia · {content.phrase_of_day.context_label}
              </span>
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>{content.phrase_of_day.en}</p>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{content.phrase_of_day.explain_pt}</p>
              <PlayButton text={content.phrase_of_day.en} accent={accent} rate={rate} />
            </div>
          )}

          {lastError && (lastError.wrong_text || lastError.right_text) && (
            <div className="v2-card" style={{ borderLeft: '4px solid var(--green)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Sua última correção
              </span>
              <p style={{ margin: 0, fontSize: 15 }}>
                <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>{lastError.wrong_text}</span>
                {' → '}
                <strong style={{ color: 'var(--green-dark)' }}>{lastError.right_text}</strong>
              </p>
              {lastError.detail_pt && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{lastError.detail_pt}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Patentes */}
      <div>
        <SectionHead title="Patentes" right="sobe com a memória espaçada" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          {[{ label: 'Escrita', letter: 'W', patent: writingPatent }, { label: 'Fala', letter: 'S', patent: speakingPatent }].map(({ label, patent }) => (
            <div key={label} className="v2-card">
              <span style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <p style={{ margin: '6px 0 8px', fontFamily: 'var(--font-mono-v2)', fontSize: 18, fontWeight: 700, color: 'var(--green-dark)' }}>{patent.label}</p>
              {patent.nextLabel && (
                <>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${patent.progressPct}%`, background: 'var(--green)' }} />
                  </div>
                  <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
                    faltam {patent.remaining} frases p/ &quot;{patent.nextLabel}&quot;
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="web-cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Memória espaçada */}
          <div className="v2-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Memória espaçada</span>
              <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)' }}>{activeTotal} frases ativas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ label: 'hoje', count: buckets.hoje }, { label: 'amanhã', count: buckets.amanha }, { label: '1 sem', count: buckets.semana }, { label: '1 mês', count: buckets.mes }].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 48, flexShrink: 0, fontSize: 12.5, color: 'var(--ink)' }}>{row.label}</span>
                  <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: 'var(--green)', width: `${(row.count / maxBucket) * 100}%` }} />
                  </div>
                  <span style={{ width: 22, textAlign: 'right', fontFamily: 'var(--font-mono-v2)', fontSize: 12, flexShrink: 0 }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Onde você mais errou */}
          <div>
            <SectionHead title="Onde você mais errou" right="últimos 7 dias" />
            {topErrors.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, marginBottom: 12 }}>
                  {topErrors.map((err, idx) => (
                    <div key={err.label} className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 14 }}>{err.label}</strong>
                        {err.detail && <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>{err.detail}</span>}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)', flexShrink: 0 }}>{err.count}x</span>
                    </div>
                  ))}
                </div>
                <Link href="/v2/pontos-fracos" className="v2-card-dark" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                  Treinar meus pontos fracos →
                </Link>
              </>
            ) : (
              <div className="v2-card-dark" style={{ opacity: 0.6, textAlign: 'center', fontWeight: 700, fontSize: 14, marginTop: 10 }}>
                Sem erros recentes — nada a treinar por aqui
              </div>
            )}
          </div>
        </div>

        {/* Antes e depois */}
        <div className="web-sticky" style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Antes e depois</span>
          <p style={{ margin: '8px 0 14px', fontSize: 13.5, color: 'var(--ink)' }}>
            Responda a mesma pergunta do seu 1º dia e compare com a resposta original.
          </p>
          {nextComparisonDue ? (
            <>
              <button type="button" disabled className="v2-card-dark" style={{ width: '100%', border: 'none', fontWeight: 700, fontSize: 14, opacity: 0.5, cursor: 'not-allowed' }}>
                Próxima comparação em {nextComparisonDate}
              </button>
              <Link href="/v2/antes-e-depois" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--green-dark)', textDecoration: 'underline' }}>
                ver minha última comparação
              </Link>
            </>
          ) : (
            <Link href="/v2/antes-e-depois" className="v2-card-dark" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Responder agora
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
