import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { buildWeakTrainingQueue } from '../../../lib/weakTraining';
import { PracticeSession } from '../../../components/v2/PracticeSession';
import { BackHeader } from '../../../components/v2/BackHeader';
import { Card, Pill } from '../../../components/ui';

export default async function PontosFracosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('correction_timing, correction_depth, voice_accent, audio_speed, pronunciation_strictness')
    .eq('id', user.id)
    .single();

  const { empty, categories, exercises, generationFailed } = await buildWeakTrainingQueue(supabase, user);

  if (empty) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <BackHeader title="Pontos fracos" />
          <Card>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Sem erros recentes — nada a treinar por aqui. Continue nas sessões diárias.
            </p>
            <Link href="/v2" className="v2-card-dark" style={{ display: 'block', marginTop: 16, textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Ir para Hoje
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (generationFailed || exercises.length === 0) {
    return (
      <div className="v2-bg" style={{ minHeight: '100dvh', padding: '24px 20px 40px', fontFamily: 'var(--font-ui-v2)' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <BackHeader title="Pontos fracos" />
          <Card>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
              Não consegui montar a sessão agora. Tenta de novo em um instante.
            </p>
            <Link href="/v2/pontos-fracos" className="v2-card-dark" style={{ display: 'block', marginTop: 16, textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              Tentar de novo
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const labelByCategory = {};
  categories.forEach((c) => { labelByCategory[c.category] = c.label; });

  const queue = exercises.map((ex) => ({
    kind: 'weak',
    mode: ex.mode,
    promptPt: ex.prompt_pt,
    expectedFocus: ex.expected_focus,
    skillTags: ex.skill_tags || [],
    personalHintPt: ex.personal_hint_pt,
    categoria: labelByCategory[ex.category] || ex.category,
  }));

  const headerExtra = (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
        Sessão gerada só com o que você mais erra
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map((c) => (
          <Pill key={c.category}>{c.label} · {c.count}x</Pill>
        ))}
      </div>
    </div>
  );

  return (
    <PracticeSession
      mode="mixed"
      initialQueue={queue}
      profile={profile}
      headerTitle="Pontos fracos"
      headerExtra={headerExtra}
      sessionKind="weak_training"
    />
  );
}
