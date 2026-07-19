import { createClient } from '../../../lib/supabase/server';
import { TabBar } from '../../../components/ui';
import { Sidebar } from '../../../components/v2/Sidebar';

// Shell único e responsivo do app (Hoje/Mapa/Progresso/Ajustes) — mesma URL
// pra qualquer tamanho de tela. Sidebar e TabBar ficam sempre montadas no
// DOM; CSS (.web-sidebar / .v2-tabbar em globals.css) decide qual aparece
// conforme a largura, sem nenhuma detecção de viewport via JS.
export default async function AppLayoutV2({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, streak_count')
    .eq('id', user.id)
    .single();

  return (
    <div className="v2-bg web-shell" style={{ fontFamily: 'var(--font-ui-v2)' }}>
      <Sidebar streak={profile?.streak_count || 0} avatarUrl={profile?.avatar_url} avatarInitial={profile?.full_name || user.email} />
      <main className="web-main">
        <div className="web-main-inner">{children}</div>
      </main>
      <TabBar basePath="/v2" />
    </div>
  );
}
