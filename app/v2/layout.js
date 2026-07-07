import { createClient } from '../../lib/supabase/server';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { ThemeSync } from '../../components/v2/ThemeSync';

// Layout raiz de /v2 — só aqui entra o ThemeProvider (dark mode real via
// next-themes), escopado a essa área. /login roda antes de qualquer sessão
// existir, então o fetch de perfil é condicional.
export default async function V2Layout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileTheme = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('theme').eq('id', user.id).maybeSingle();
    profileTheme = profile?.theme || null;
  }

  return (
    <ThemeProviderV2>
      <ThemeSync profileTheme={profileTheme} />
      {children}
    </ThemeProviderV2>
  );
}
