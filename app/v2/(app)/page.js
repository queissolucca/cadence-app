import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { dayKeySP, weekStartSP, weekEndSP, addDays, todayKeySP } from '../../../lib/dates';
import { AppHeader } from '../../../components/ui';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // segunda -> domingo

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()),
  );
  if (hour < 12) return 'Bom dia! Bora conversar?';
  if (hour < 18) return 'Boa tarde! Bora conversar?';
  return 'Boa noite! Bora conversar?';
}

// Home enxuta: só a sequência da semana + o atalho pra conversa. Sem geração
// de conteúdo do dia (a chamada síncrona à Claude API era o maior gargalo de
// carga) — agora são 2 queries baratas ao Supabase e nada mais, então a tela
// pinta na hora. Todo o "aprender" aconteceu na aba Conversar.
export default async function HojePageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const weekStart = weekStartSP(now);

  const [profileRes, weekSessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, streak_count, streak_shields, weekly_cadence_target')
      .eq('id', user.id)
      .single(),
    supabase
      .from('sessions')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', weekStart.toISOString())
      .lte('started_at', weekEndSP(now).toISOString()),
  ]);

  const profile = profileRes.data;
  const weekSessions = weekSessionsRes.data;

  const daysWithSession = new Set((weekSessions || []).map((s) => dayKeySP(new Date(s.started_at))));
  const todayKey = todayKeySP();
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKeySP(date);
    return { key, label: WEEKDAY_LABELS[i], done: daysWithSession.has(key), isToday: key === todayKey };
  });
  const weeklyGoal = profile?.weekly_cadence_target || 5;

  return (
    <>
      <div className="mobile-only">
        <AppHeader
          streak={profile?.streak_count || 0}
          streakShields={profile?.streak_shields || 0}
          avatarUrl={profile?.avatar_url}
          avatarInitial={profile?.full_name || user.email}
        />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{getGreeting()}</p>
      </div>
      <div className="desktop-only">
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: 0, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>

      {/* Sequência da semana — 7 bolinhas segunda->domingo */}
      <div className="v2-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sua semana</span>
          <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 12.5, color: 'var(--ink)' }}>
            {daysWithSession.size}/{weeklyGoal} dias
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {weekDots.map((d) => (
            <div
              key={d.key}
              title={d.key}
              style={{
                flex: 1, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                background: d.done ? 'var(--green)' : 'transparent',
                color: d.done ? '#fff' : 'var(--ink)',
                border: d.done ? 'none' : `1.5px solid ${d.isToday ? 'var(--ink)' : 'var(--line)'}`,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* CTA principal — conversar */}
      <Link href="/v2/conversar" style={{ textDecoration: 'none' }}>
        <div className="v2-card-green" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 18 }}>Conversar em inglês</strong>
            <p style={{ margin: '3px 0 0', fontSize: 13.5, opacity: 0.85 }}>Fale de verdade com seu coach — ele corrige na hora.</p>
          </div>
          <span style={{ fontSize: 22, opacity: 0.85, flexShrink: 0 }}>→</span>
        </div>
      </Link>
    </>
  );
}
