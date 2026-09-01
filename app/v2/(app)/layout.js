import { createClient } from '../../../lib/supabase/server';
import { TabBar } from '../../../components/ui';
import { Sidebar } from '../../../components/v2/Sidebar';
import { streakFromDayKeys } from '../../../lib/streak';
import { dayKeySP, todayKeySP } from '../../../lib/dates';
import { Tracker } from '../../../components/Tracker';

// Shell único e responsivo do app (Hoje/Mapa/Progresso/Ajustes) — mesma URL
// pra qualquer tamanho de tela. Sidebar e TabBar ficam sempre montadas no
// DOM; CSS (.web-sidebar / .v2-tabbar em globals.css) decide qual aparece
// conforme a largura, sem nenhuma detecção de viewport via JS.
export default async function AppLayoutV2({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cutoff = new Date(Date.now() - 120 * 86400000).toISOString();
  const [profileRes, sessionsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    supabase.from('sessions').select('started_at').eq('user_id', user.id).gte('started_at', cutoff),
  ]);
  const profile = profileRes.data;
  // Streak derivado das sessões (mesma fonte do calendário / da Início).
  const doneSet = new Set((sessionsRes.data || []).map((s) => dayKeySP(new Date(s.started_at))));
  const streak = streakFromDayKeys(doneSet, todayKeySP());

  return (
    <div className="v2-bg web-shell" style={{ fontFamily: 'var(--font-ui-v2)' }}>
      <Tracker />
      <Sidebar streak={streak} avatarUrl={profile?.avatar_url} avatarInitial={profile?.full_name || user.email} />
      <main className="web-main">
        <div className="web-main-inner">{children}</div>
      </main>
      <TabBar basePath="/v2" />
    </div>
  );
}
