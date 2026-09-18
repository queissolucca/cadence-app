'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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

export function PortaoProvider({ temPlano = false, children }) {
  const caminho = usePathname();
  const router = useRouter();

  /* A ROTA DECIDE, não o clique.

     Antes o clique na aba era interceptado e a pessoa não saía do lugar — ela
     via o popup sobre a tela em que já estava. Agora ela ENTRA na trilha e o
     popup abre por cima: dá pra ver, no fundo, o que está sendo oferecido.
     Vender uma tela que a pessoa nunca viu é mais difícil do que mostrar.

     Ler a rota também cobre de graça quem chega por link direto, favorito ou
     "abrir em nova aba" — nenhum desses passa por clique nenhum. */
  const recursoDaRota = temPlano ? null : recursoPagoDaPagina(caminho);
  const [recurso, setRecurso] = useState(recursoDaRota);

  // Trocar de rota reabre (ou fecha) o popup sem remontar nada.
  useEffect(() => { setRecurso(recursoDaRota); }, [recursoDaRota]);

  /* Devolve true quando ENGOLIU a ação. Quem chama usa isso pra decidir se
     segue ou para — o que mantém os links sendo links de verdade. */
  const pedirPlano = useCallback((qual) => {
    if (temPlano) return false;
    setRecurso(qual || null);
    return true;
  }, [temPlano]);

  /* Fechar numa página paga VOLTA pro início. Só esconder o popup deixaria a
     pessoa sozinha numa tela que ela não pode usar, sem nada acontecendo — e
     sem caminho de saída além do botão de voltar do navegador. */
  const fechar = useCallback(() => {
    setRecurso(null);
    if (recursoPagoDaPagina(caminho)) router.push('/v2');
  }, [caminho, router]);

  const valor = useMemo(() => ({ temPlano, pedirPlano }), [temPlano, pedirPlano]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      <PortaoPago recurso={recurso} aberto={!!recurso} aoFechar={fechar} />
    </Ctx.Provider>
  );
}

export { recursoPagoDaPagina };
