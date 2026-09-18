'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { PortaoPago } from './PortaoPago';
import { recursoPagoDaPagina } from '../../lib/acesso';

/* QUEM SABE SE A PESSOA PAGOU, E QUEM ABRE O POPUP.

   É contexto, e não estado local, porque três lugares distantes precisam da
   mesma resposta: a barra de abas e a lateral (pra pôr o cadeado na Trilha), e
   as telas pagas (pra abrir o popup quando alguém chega por link direto). Com
   estado local, cada um teria sua própria cópia — e três cópias da mesma
   pergunta dão três respostas diferentes no dia em que uma delas esquecer de
   atualizar.

   O provider é client; o dado vem do servidor, por prop. O layout já consulta
   `temPlanoCompleto()` de qualquer forma, então não há ida extra ao banco. */

const Ctx = createContext({ temPlano: true, pedirPlano: () => false });

export function usePortao() {
  return useContext(Ctx);
}

export function PortaoProvider({ temPlano = false, recursoDaRota = null, children }) {
  /* Abre já montado quando a rota EM SI é paga: quem chegou em /v2/conversar
     por link, favorito ou "abrir em nova aba" não passou por nenhum clique que
     pudesse ser interceptado. Sem isto, essa pessoa veria a tela de voz e um
     erro 402 vindo da API, que não explica nada. */
  const [recurso, setRecurso] = useState(() => (temPlano ? null : recursoDaRota));

  /* Devolve true quando ENGOLIU a ação. Quem chama usa isso pra decidir se
     segue ou para — o que mantém os links sendo links de verdade. */
  const pedirPlano = useCallback((qual) => {
    if (temPlano) return false;
    setRecurso(qual || null);
    return true;
  }, [temPlano]);

  const fechar = useCallback(() => setRecurso(null), []);
  const valor = useMemo(() => ({ temPlano, pedirPlano }), [temPlano, pedirPlano]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <PortaoPago recurso={recurso} aberto={!!recurso} aoFechar={fechar} />
    </Ctx.Provider>
  );
}

export { recursoPagoDaPagina };
