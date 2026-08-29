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

const TABS = [
  { key: 'hoje', href: '', label: 'Hoje', Icon: IconHome },
  { key: 'conversar', href: '/conversar', label: 'Conversar', Icon: IconMic },
  { key: 'ajustes', href: '/ajustes', label: 'Ajustes', Icon: IconGear },
];

// basePath: raiz onde o shell vive hoje ("/v2" enquanto roda em paralelo ao
// app atual — ver histórico da conversa). Some pra "" quando isso um dia
// virar a rota raiz de verdade, sem precisar tocar em nada além disso.
export function TabBar({ active, basePath = '' }) {
  const pathname = usePathname();

  return (
    <nav className="v2-tabbar">
      {TABS.map(({ key, href, label, Icon }) => {
        const fullHref = `${basePath}${href}` || '/';
        const isActive = active ? active === key : pathname === fullHref;
        return (
          <Link key={key} href={fullHref} className={`v2-tab-btn ${isActive ? 'v2-tab-active' : ''}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
