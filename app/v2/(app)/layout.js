import { TabBar } from '../../../components/ui';
import { Sidebar } from '../../../components/v2/Sidebar';
import { ConstellationBg } from '../../../components/v2/ConstellationBg';
import { streakFromDayKeys } from '../../../lib/streak';
import { todayKeySP } from '../../../lib/dates';
import { Tracker } from '../../../components/Tracker';
import { identidade, perfilV2, diasComSessao } from '../../../lib/sessaoServidor';
import { ProvedorNav } from '../../../components/v2/NavegacaoPendente';

// Shell único e responsivo do app (Hoje/Revisão/Perfil) — mesma URL pra
// qualquer tamanho de tela. Sidebar e TabBar ficam sempre montadas no DOM;
// CSS (.web-sidebar / .v2-tabbar em globals.css) decide qual aparece conforme
// a largura, sem nenhuma detecção de viewport via JS.
//
// Perfil e sessões saem do lib/sessaoServidor: as MESMAS consultas que a
// página abaixo faz, resolvidas uma vez por requisição em vez de uma vez por
// nível da árvore.
export default async function AppLayoutV2({ children }) {
  const [eu, perfil, { dias }] = await Promise.all([identidade(), perfilV2(), diasComSessao()]);

  // Streak derivado das sessões (mesma fonte do calendário / da Início).
  const streak = streakFromDayKeys(dias, todayKeySP());

  /* O ProvedorNav é a raiz do shell (e não um componente solto dentro dele)
     porque ele escuta os cliques na fase de captura: precisa estar por cima de
     TUDO que tem link — abas, barra lateral, cartões da Início e os "voltar".
     Ele é só uma div com um ouvinte, então continua sendo o mesmo `.v2-bg
     .web-shell` de antes; nada mudou de lugar no CSS. */
  return (
    <ProvedorNav className="v2-bg web-shell" style={{ fontFamily: 'var(--font-ui-v2)' }}>
      <Tracker />
      {/* Antes do conteúdo de propósito: o fundo do shell pinta primeiro, o
          canvas fica em z-index 0 e sidebar/main sobem pra 1 (globals.css). */}
      <ConstellationBg />
      <Sidebar streak={streak} avatarUrl={perfil?.avatar_url} avatarInitial={perfil?.full_name || eu?.email} />
      <main className="web-main">
        <div className="web-main-inner">{children}</div>
      </main>
      <TabBar basePath="/v2" />
    </ProvedorNav>
  );
}
