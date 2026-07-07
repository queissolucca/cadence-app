import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/server';
import { weekStartSP, weekEndSP, addDays } from '../../../../lib/dates';
import { bucketReviewItems } from '../../../../lib/srs';
import { computePatentByCount } from '../../../../lib/patents';
import { SectionHead } from '../../../../components/ui';

function formatShortDate(date) {
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

// Verde quando "melhor" (mais é melhor pra todo stat aqui), vermelho
// quando pior, cinza quando não há dado da semana passada pra comparar.
function DeltaPill({ hasPrevious, improved, children }) {
  const bg = !hasPrevious ? '#f1f1e9' : improved ? 'var(--green-soft)' : '#f7e9e6';
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
  const weekStart = weekStartSP(now);
  const weekEnd = weekEndSP(now);
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekEnd, -7);

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
    { data: snapshots },
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
    supabase.from('progress_snapshots').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
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

  // Antes e depois
  const latestSnapshot = snapshots?.[0];
  const daysSinceSnapshot = latestSnapshot ? (Date.now() - new Date(latestSnapshot.created_at).getTime()) / 86400000 : Infinity;
  const nextComparisonDue = daysSinceSnapshot < 28;
  const nextComparisonDate = latestSnapshot ? formatShortDate(new Date(new Date(latestSnapshot.created_at).getTime() + 28 * 86400000)) : null;

  return (
    <>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)' }}>
          Semana de {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
        </p>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>Progresso</h1>
      </div>

      {/* Grid 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
              <div style={{ flex: 1, height: 10, borderRadius: 999, background: '#f0ede3', overflow: 'hidden' }}>
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

      {/* Antes e depois */}
      <div style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 16 }}>
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
    </>
  );
}
