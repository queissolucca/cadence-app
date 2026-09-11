import Link from 'next/link';
import { identidade, perfilV2, diasComSessao } from '../../../lib/sessaoServidor';
import { dayKeySP, weekStartSP, addDays, todayKeySP } from '../../../lib/dates';
import { streakFromDayKeys } from '../../../lib/streak';
import { AppHeader } from '../../../components/ui';
import { StreakCard } from '../../../components/v2/StreakCard';

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // segunda -> domingo

function getGreeting() {
  return 'Bora conversar?';
}

export default async function HojePageV2() {
  // As três coisas saem do cache de requisição do lib/sessaoServidor: o layout
  // acima já pediu as mesmas, então aqui não custa ida à rede nenhuma.
  const [user, profile, { dias: doneSet }] = await Promise.all([identidade(), perfilV2(), diasComSessao()]);

  const now = new Date();
  const todayKey = todayKeySP();
  const spYM = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(now);
  const [curYear, curMonth] = spYM.split('-').map(Number);
  const weekStart = weekStartSP(now);

  const doneDays = Array.from(doneSet);

  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKeySP(date);
    return { key, label: WEEKDAY_LABELS[i], done: doneSet.has(key), isToday: key === todayKey };
  });
  const weekDoneCount = weekDots.filter((d) => d.done).length;

  const weeklyGoal = profile?.weekly_cadence_target || 5;
  // Streak derivado das sessões (mesma fonte do calendário) — sempre bate com os
  // dias completos, sem depender do contador incremental que podia dessincronizar.
  const streakCount = streakFromDayKeys(doneSet, todayKey);

  // Recorde de streak: vem no mesmo select do perfil (best-effort — a coluna
  // streak_max é da migration 0013 e pode não existir ainda).
  const streakMax = typeof profile?.streak_max === 'number' ? Math.max(streakCount, profile.streak_max) : streakCount;

  // "Membro desde" saía de user.created_at, e era o ÚNICO campo desta tela que
  // exigia o objeto de usuário completo (ou seja, uma ida à rede ao servidor de
  // auth só por causa dele). profiles.created_at é a mesma data: a linha nasce
  // no gatilho handle_new_user, junto com a conta.
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    : null;

  return (
    <>
      <div className="mobile-only">
        <AppHeader
          streak={streakCount}
          avatarUrl={profile?.avatar_url}
          avatarInitial={profile?.full_name || user?.email}
          profile={{ fullName: profile?.full_name || '', email: user?.email || '', memberSince, streakMax }}
        />
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{getGreeting()}</p>
      </div>
      <div className="desktop-only">
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: 0, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>

      <StreakCard
        weekDots={weekDots}
        weekdayLabels={WEEKDAY_LABELS}
        weekDoneCount={weekDoneCount}
        weeklyGoal={weeklyGoal}
        doneDays={doneDays}
        todayKey={todayKey}
        year={curYear}
        month={curMonth}
      />

      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', margin: '2px 0 0', color: 'var(--ink)' }}>Como você quer aprender hoje?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link href="/v2/conversar" style={{ textDecoration: 'none' }}>
          <div className="v2-card-dark" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 132 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--green)', color: '#16231C', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>Conversa aberta</strong>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.85, lineHeight: 1.4 }}>Converse à vontade com a Cady!</p>
            </div>
          </div>
        </Link>

        <Link href="/v2/trilha" style={{ textDecoration: 'none' }}>
          <div className="v2-card-green" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 132 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#16231C', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>Trilha de aprendizagem</strong>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.85, lineHeight: 1.4 }}>Do intermediário ao avançado, 1-2min</p>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
