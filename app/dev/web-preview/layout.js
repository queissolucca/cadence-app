import { ThemeProviderV2 } from '../../../components/v2/ThemeProviderV2';
import { Sidebar } from '../../../components/v2/Sidebar';
import { TabBar } from '../../../components/ui';

// Preview visual sem login e sem Supabase — vive fora de /v2 (middleware só
// protege /v2 e /pagamento) e usa dados mockados nas pages abaixo. Reaproveita
// o MESMO shell responsivo de app/v2/(app)/layout.js (Sidebar+TabBar, CSS
// decide qual aparece), então o que se vê aqui é exatamente o que roda em
// produção — só sem exigir login.
export default function WebPreviewLayout({ children }) {
  return (
    <ThemeProviderV2>
      <div className="v2-bg web-shell">
        <Sidebar streak={12} avatarInitial="Lucca" basePath="/dev/web-preview" />
        <main className="web-main">
          <div className="web-main-inner">
            <div style={{ background: 'var(--v2-badge-neutral-bg)', color: 'var(--ink-soft)', fontSize: 12.5, borderRadius: 10, padding: '8px 14px' }}>
              Modo preview — dados fictícios, sem login. Ações que dependem da API (salvar, avaliar resposta, etc.) não persistem nada de verdade.
            </div>
            {children}
          </div>
        </main>
        <TabBar basePath="/dev/web-preview" />
      </div>
    </ThemeProviderV2>
  );
}
