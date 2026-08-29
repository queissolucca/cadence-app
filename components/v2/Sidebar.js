'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.3M12 18.2v2.3M4.9 6.9l1.6 1.6M17.5 15.5l1.6 1.6M3.5 12h2.3M18.2 12h2.3M4.9 17.1l1.6-1.6M17.5 8.5l1.6-1.6" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '', label: 'Início', Icon: IconHome },
  { href: '/conversar', label: 'Conversar', Icon: IconMic },
  { href: '/ajustes', label: 'Ajustes', Icon: IconGear },
];

// Barra lateral usada em telas largas dentro do MESMO layout responsivo de
// /v2/(app) — em telas estreitas fica com display:none (ver .web-sidebar em
// globals.css) e a TabBar (components/ui/TabBar.js) assume, ambas montadas
// sempre no DOM pra evitar qualquer detecção de viewport via JS.
export function Sidebar({ streak = 0, avatarUrl, avatarInitial, basePath = '/v2' }) {
  const pathname = usePathname();
  const NAV = NAV_ITEMS.map((item) => ({ ...item, href: `${basePath}${item.href}` }));

  return (
    <aside className="web-sidebar">
      <div className="web-sidebar-logo">cadence</div>

      <nav className="web-sidebar-nav">
        {NAV.map(({ href, label, Icon }) => {
          const isActive = href === basePath ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`web-nav-link ${isActive ? 'web-nav-active' : ''}`}>
              <Icon />
              <span>{label}</span>
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
