'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDestinoPendente } from '../v2/NavegacaoPendente';

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

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

const TABS = [
  { key: 'hoje', href: '', label: 'Início', Icon: IconHome },
  { key: 'revisao', href: '/revisao', label: 'Revisão', Icon: IconReview },
  { key: 'ajustes', href: '/ajustes', label: 'Perfil', Icon: IconUser },
];

// basePath: raiz onde o shell vive hoje ("/v2" enquanto roda em paralelo ao
// app atual — ver histórico da conversa). Some pra "" quando isso um dia
// virar a rota raiz de verdade, sem precisar tocar em nada além disso.
export function TabBar({ active, basePath = '' }) {
  const pathname = usePathname();
  /* A aba tocada acende ANTES de a tela nova chegar. Sem isto, a resposta ao
     toque era a tela nova — e até ela vir (uma ida ao servidor), a interface
     ficava idêntica à de antes do toque, o que se lê como "não pegou".
     Ver components/v2/NavegacaoPendente.js. */
  const pendente = useDestinoPendente();

  return (
    <nav className="v2-tabbar">
      {TABS.map(({ key, href, label, Icon }) => {
        const fullHref = `${basePath}${href}` || '/';
        const chegando = pendente === fullHref;
        // Enquanto há destino pendente, ele manda: a aba de origem apaga junto,
        // senão duas ficariam acesas ao mesmo tempo.
        const isActive = chegando || (!pendente && (active ? active === key : pathname === fullHref));
        return (
          <Link
            key={key}
            href={fullHref}
            aria-current={isActive ? 'page' : undefined}
            className={`v2-tab-btn ${isActive ? 'v2-tab-active' : ''} ${chegando ? 'v2-tab-chegando' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
