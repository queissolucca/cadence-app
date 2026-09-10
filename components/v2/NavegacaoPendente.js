'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/* RESPOSTA IMEDIATA AO TOQUE, ENQUANTO O SERVIDOR AINDA PENSA.

   O problema não é só a espera — é a espera MUDA. Toda tela do /v2 é renderizada
   no servidor (tem dado de usuário), então clicar numa aba dispara uma ida ao
   servidor. Enquanto ela não volta, o `<Link>` do Next não muda nada na tela:
   a aba tocada continua apagada, a antiga continua acesa, e a pessoa acha que o
   toque não pegou — e toca de novo, o que só enfileira mais trabalho.

   O consenso em pesquisa de interface é antigo e simples: até ~100ms parece
   instantâneo; a partir de ~1s a pessoa precisa de sinal de que o sistema
   ouviu, ou desiste. As telas ficaram bem mais rápidas nesta rodada, mas rede
   de celular é rede de celular — então o sinal tem que existir de qualquer
   jeito, e ele é de graça: é estado local, pintado no mesmo quadro do toque.

   COMO FUNCIONA. Um ouvinte na FASE DE CAPTURA, na raiz do shell, vê todo
   clique em link interno antes de qualquer coisa acontecer. Isso pega de uma
   vez as abas, a barra lateral, os cartões da Início e os "voltar" — sem que
   nenhum deles precise saber que este arquivo existe.

   E não substitui o `<Link>` por `router.push()` de propósito: o Link é quem
   dá o prefetch (o esqueleto da rota já baixado antes do clique), o
   cmd+clique, o clique do meio e o foco por teclado. Trocá-lo por push perderia
   os quatro pra ganhar um `isPending` que aqui sai mais barato.

   O `destino` é limpo quando o pathname VIRA o destino — ou seja, exatamente
   quando a tela nova entrou. Se o Next abortar a navegação (ou o link não
   navegar), um teto de 10s desarma o indicador em vez de deixá-lo aceso pra
   sempre. */

const Ctx = createContext({ destino: null });

export function useDestinoPendente() {
  return useContext(Ctx).destino;
}

const TETO_MS = 10000;

export function ProvedorNav({ children, className, style }) {
  const pathname = usePathname();
  const [destino, setDestino] = useState(null);
  const timer = useRef(0);

  const aoClicar = useCallback((e) => {
    // Cliques que NÃO navegam nesta aba: modificador, botão do meio, target
    // próprio, download. Marcar pendente neles acenderia um indicador que
    // nunca apaga.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target?.closest?.('a[href]');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    // Só rota interna: externo troca de documento e o indicador iria embora com
    // a página; ancora (#) não navega.
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    const alvo = href.split('#')[0];
    if (alvo === pathname) return;   // já estamos nela: nada a esperar
    setDestino(alvo);
  }, [pathname]);

  // Chegou: apaga.
  useEffect(() => {
    setDestino(null);
  }, [pathname]);

  // Rede de segurança pra navegação que não completa.
  useEffect(() => {
    clearTimeout(timer.current);
    if (!destino) return undefined;
    timer.current = setTimeout(() => setDestino(null), TETO_MS);
    return () => clearTimeout(timer.current);
  }, [destino]);

  const valor = useMemo(() => ({ destino }), [destino]);

  return (
    <Ctx.Provider value={valor}>
      {/* onClickCapture: roda antes do handler do Link, então o estado local
          entra no MESMO quadro do toque — é isso que faz parecer instantâneo. */}
      <div className={className} style={style} onClickCapture={aoClicar}>
        <BarraNav ativa={!!destino} />
        {children}
      </div>
    </Ctx.Provider>
  );
}

/* Fio de progresso no topo. Fica sempre no DOM (montar/desmontar custaria um
   quadro justamente no momento em que ele precisa aparecer) e só troca de
   opacidade e de largura. Decorativo pra leitor de tela: quem usa leitor já é
   avisado da troca de página pelo próprio router. */
function BarraNav({ ativa }) {
  return (
    <div className={`v2-nav-barra ${ativa ? 'ativa' : ''}`} aria-hidden="true">
      <span />
    </div>
  );
}
