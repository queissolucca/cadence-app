import Link from 'next/link';
import { SectionHead } from '../../../../components/ui';
import { MOCK_STATS, MOCK_PATENTS, MOCK_BUCKETS, MOCK_TOP_ERRORS } from '../_mock';

function DeltaPill({ improved, children }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 11, borderRadius: 999, padding: '3px 9px', background: improved ? 'var(--green-soft)' : 'var(--v2-badge-due-bg)', color: improved ? 'var(--green-dark)' : 'var(--red)', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, delta }) {
  return (
    <div className="v2-card">
      <span style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <p style={{ margin: '6px 0 8px', fontSize: 28, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono-v2)' }}>{value}</p>
      {delta}
    </div>
  );
}

export default function ProgressoWebPreviewPage() {
  const s = MOCK_STATS;
  const maxBucket = Math.max(1, MOCK_BUCKETS.hoje, MOCK_BUCKETS.amanha, MOCK_BUCKETS.semana, MOCK_BUCKETS.mes);
  const activeTotal = MOCK_BUCKETS.hoje + MOCK_BUCKETS.amanha + MOCK_BUCKETS.semana + MOCK_BUCKETS.mes;

  return (
    <>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-soft)' }}>Semana de 10 jul – 16 jul</p>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ink)' }}>Progresso</h1>
      </div>

      <div className="web-grid-4">
        <StatCard label="Frases praticadas" value={s.attemptsThisWeek} delta={<DeltaPill improved>{`↑ +${s.attemptsThisWeek - s.attemptsLastWeek} vs sem. passada`}</DeltaPill>} />
        <StatCard label="Acerto na revisão" value={`${s.pctThisWeek}%`} delta={<DeltaPill improved>{`sem. passada: ${s.pctLastWeek}%`}</DeltaPill>} />
        <StatCard label="Dominadas na semana" value={s.masteredThisWeek} delta={<DeltaPill improved>{`${s.masteredTotal} no total`}</DeltaPill>} />
        <StatCard label="Minutos de prática" value={s.minutesThisWeek} delta={<DeltaPill improved>{`sem. passada: ${s.minutesLastWeek} min`}</DeltaPill>} />
      </div>

      <div>
        <SectionHead title="Patentes" right="sobe com a memória espaçada" />
        <div className="web-grid-2" style={{ marginTop: 10 }}>
          {[{ label: 'Escrita', patent: MOCK_PATENTS.writing }, { label: 'Fala', patent: MOCK_PATENTS.speaking }].map(({ label, patent }) => (
            <div key={label} className="v2-card">
              <span style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <p style={{ margin: '6px 0 8px', fontFamily: 'var(--font-mono-v2)', fontSize: 19, fontWeight: 700, color: 'var(--green-dark)' }}>{patent.label}</p>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${patent.progressPct}%`, background: 'var(--green)' }} />
              </div>
              <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
                faltam {patent.remaining} frases p/ &quot;{patent.nextLabel}&quot;
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="web-cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="v2-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Memória espaçada</span>
              <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)' }}>{activeTotal} frases ativas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ label: 'hoje', count: MOCK_BUCKETS.hoje }, { label: 'amanhã', count: MOCK_BUCKETS.amanha }, { label: '1 sem', count: MOCK_BUCKETS.semana }, { label: '1 mês', count: MOCK_BUCKETS.mes }].map((row) => (
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

          <div>
            <SectionHead title="Onde você mais errou" right="últimos 7 dias" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, marginBottom: 12 }}>
              {MOCK_TOP_ERRORS.map((err, idx) => (
                <div key={err.label} className="v2-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>{err.label}</strong>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>{err.detail}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12, color: 'var(--ink-soft)', flexShrink: 0 }}>{err.count}x</span>
                </div>
              ))}
            </div>
            <Link href="/dev/web-preview" className="v2-card-dark" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Treinar meus pontos fracos →
            </Link>
          </div>
        </div>

        <div className="web-sticky" style={{ background: 'var(--green-soft)', borderRadius: 'var(--radius-card)', padding: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Antes e depois</span>
          <p style={{ margin: '8px 0 14px', fontSize: 13.5, color: 'var(--ink)' }}>
            Responda a mesma pergunta do seu 1º dia e compare com a resposta original.
          </p>
          <div className="v2-card-dark" style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
            Responder agora
          </div>
        </div>
      </div>
    </>
  );
}
