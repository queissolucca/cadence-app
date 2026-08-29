import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../../lib/supabase/server';
import { getUnit } from '../../../../../lib/track/units';
import { DEFAULT_AGENT } from '../../../../../lib/track/sessionOptions';
import { ConversationClient } from '../../../../../components/v2/ConversationClient';

// C3 — rodar a lição: abre a Cadi já com o alvo/contexto/drill da unidade
// injetados (dynamic variables), pra ela conduzir o drill de 1–2 min.
export default async function UnitPage({ params }) {
  const unit = getUnit(params.unitId);
  if (!unit) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  return (
    <>
      <Link
        href="/v2/trilha"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--ink-soft)', fontSize: 13, padding: '2px 0 12px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Trilha
      </Link>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 12, color: 'var(--green-dark, var(--green))' }}>
          {unit.level} · {unit.moduleTitle}
        </span>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.5px', margin: '4px 0 0', color: 'var(--ink)' }}>{unit.title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono-v2, monospace)', fontSize: 11, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '3px 9px', borderRadius: 7 }}>{unit.target}</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{unit.context} · ~1–2 min</span>
        </div>
      </div>

      <ConversationClient
        firstName={firstName}
        agent={DEFAULT_AGENT}
        unit={{ title: unit.title, focus: unit.target, drill: unit.drill, context: unit.context }}
      />
    </>
  );
}
