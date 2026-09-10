import { perfilV2 } from '../../lib/sessaoServidor';
import { ThemeProviderV2 } from '../../components/v2/ThemeProviderV2';
import { ThemeSync } from '../../components/v2/ThemeSync';

// Layout raiz de /v2 — só aqui entra o ThemeProvider (dark mode real via
// next-themes), escopado a essa área. /login roda antes de qualquer sessão
// existir, então o perfilV2 já devolve null sozinho pra quem não tem sessão.
//
// Este layout fazia um getUser() (ida à rede ao servidor de auth) + um select
// só pro tema, e os dois se repetiam no layout de baixo e na página. Agora sai
// tudo do lib/sessaoServidor, que resolve uma vez por requisição — ver o
// comentário grande de lá.
export default async function V2Layout({ children }) {
  const perfil = await perfilV2();

  return (
    <ThemeProviderV2>
      <ThemeSync profileTheme={perfil?.theme || null} />
      {children}
    </ThemeProviderV2>
  );
}
