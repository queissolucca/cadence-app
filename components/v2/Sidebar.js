'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CadenceLogo } from './CadenceLogo';
import { useDestinoPendente } from './NavegacaoPendente';
import { usePortao } from './PortaoProvider';

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconReview() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function IconTrilha() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="18" r="2.2" /><circle cx="12" cy="11" r="2.2" /><circle cx="18" cy="5" r="2.2" />
      <path d="M7.7 16.6 10.4 12.5M13.7 9.4l2.7-2.6" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg className="web-nav-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '', label: 'Início', Icon: IconHome },
  { href: '/trilha', label: 'Trilha', Icon: IconTrilha, pago: 'trilha' },
  { href: '/revisao', label: 'Revisão', Icon: IconReview },
  { href: '/ajustes', label: 'Perfil', Icon: IconUser },
];

// Barra lateral usada em telas largas dentro do MESMO layout responsivo de
// /v2/(app) — em telas estreitas fica com display:none (ver .web-sidebar em
// globals.css) e a TabBar (components/ui/TabBar.js) assume, ambas montadas
// sempre no DOM pra evitar qualquer detecção de viewport via JS.
export function Sidebar({ streak = 0, avatarUrl, avatarInitial, basePath = '/v2' }) {
  const pathname = usePathname();
  // Mesmo motivo da TabBar: o item clicado acende no quadro do clique, sem
  // esperar a tela nova. Ver components/v2/NavegacaoPendente.js.
  const pendente = useDestinoPendente();
  const NAV = NAV_ITEMS.map((item) => ({ ...item, href: `${basePath}${item.href}` }));
  const { temPlano, pedirPlano } = usePortao();

  return (
    <aside className="web-sidebar">
      <Link href={basePath} className="web-sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }}><CadenceLogo word={22} variant="inherit" /></Link>

      <nav className="web-sidebar-nav">
        {NAV.map(({ href, label, Icon, pago }) => {
          const trancada = !!pago && !temPlano;
          const chegando = pendente === href;
          const aqui = href === basePath ? pathname === href : pathname.startsWith(href);
          const isActive = chegando || (!pendente && aqui);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`web-nav-link ${isActive ? 'web-nav-active' : ''} ${chegando ? 'web-nav-chegando' : ''} ${trancada ? 'web-nav-trancada' : ''}`}
              onClick={(e) => {
                // Só o clique comum vira popup — ver o mesmo trecho na TabBar.
                if (!trancada || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                pedirPlano(pago);
              }}
            >
              <Icon />
              <span>{label}</span>
              {trancada && <IconCadeado />}
            </Link>
          );
        })}
      </nav>

      <div className="web-sidebar-footer">
        <div className="v2-pill" style={{ justifyContent: 'center' }}>
          <span className="v2-pill-dot" />
          {streak} {streak === 1 ? 'dia de sequência' : 'dias de sequência'}
        </div>
        <div className="web-sidebar-profile">
          <span className="v2-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              <span>{(avatarInitial || '?').charAt(0).toUpperCase()}</span>
            )}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{avatarInitial}</span>
        </div>
      </div>
    </aside>
  );
}
