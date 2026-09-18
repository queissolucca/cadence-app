'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDestinoPendente } from '../v2/NavegacaoPendente';
import { usePortao } from '../v2/PortaoProvider';

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
    <svg className="v2-tab-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

/* `pago` marca a aba que exige o plano completo. Ela CONTINUA visível pra quem
   não pagou — de propósito: uma aba escondida não vende nada, e a pessoa não
   procura o que não sabe que existe. Ela vê, toca, e o popup explica. */
const TABS = [
  { key: 'hoje', href: '', label: 'Início', Icon: IconHome },
  { key: 'trilha', href: '/trilha', label: 'Trilha', Icon: IconTrilha, pago: 'trilha' },
  { key: 'revisao', href: '/revisao', label: 'Revisão', Icon: IconReview },
  { key: 'ajustes', href: '/ajustes', label: 'Perfil', Icon: IconUser },
];

// basePath: raiz onde o shell vive hoje ("/v2" enquanto roda em paralelo ao
// app atual — ver histórico da conversa). Some pra "" quando isso um dia
// virar a rota raiz de verdade, sem precisar tocar em nada além disso.
export function TabBar({ active, basePath = '' }) {
  const pathname = usePathname();
  // Só o cadeado: o clique agora LEVA pra tela, e o popup abre lá.
  const { temPlano } = usePortao();
  /* A aba tocada acende ANTES de a tela nova chegar. Sem isto, a resposta ao
     toque era a tela nova — e até ela vir (uma ida ao servidor), a interface
     ficava idêntica à de antes do toque, o que se lê como "não pegou".
     Ver components/v2/NavegacaoPendente.js. */
  const pendente = useDestinoPendente();

  return (
    <nav className="v2-tabbar">
      {TABS.map(({ key, href, label, Icon, pago }) => {
        const fullHref = `${basePath}${href}` || '/';
        const trancada = !!pago && !temPlano;
        const chegando = pendente === fullHref;
        // Enquanto há destino pendente, ele manda: a aba de origem apaga junto,
        // senão duas ficariam acesas ao mesmo tempo.
        const isActive = chegando || (!pendente && (active ? active === key : pathname === fullHref));
        return (
          <Link
            key={key}
            href={fullHref}
            aria-current={isActive ? 'page' : undefined}
            className={`v2-tab-btn ${isActive ? 'v2-tab-active' : ''} ${chegando ? 'v2-tab-chegando' : ''} ${trancada ? 'v2-tab-trancada' : ''}`}
          >
            <Icon />
            <span>{label}</span>
            {trancada && <IconCadeado />}
          </Link>
        );
      })}
    </nav>
  );
}
