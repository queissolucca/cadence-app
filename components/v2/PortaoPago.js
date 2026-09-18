'use client';

import { useEffect, useState } from 'react';
import { conviteDe } from '../../lib/acesso';

/* O POPUP DO PLANO COMPLETO.

   Aparece quando alguém do plano grátis toca em falar ou na trilha. Ele NÃO é
   o portão: quem barra de verdade é o middleware, na API, e um popup se fecha
   no inspetor. Isto aqui é a explicação — o portão sozinho devolve 402, que
   não diz nada a ninguém.

   Por que ele é modal e não uma página: a pessoa estava fazendo uma coisa.
   Tirá-la da tela pra mostrar preço faz ela perder o lugar, e voltar depois
   custa mais do que ela quer pagar por uma curiosidade. Fechando o popup, ela
   continua exatamente onde estava — escrevendo, que é de graça. */

export function PortaoPago({ recurso, aberto, aoFechar }) {
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState('');
  const convite = conviteDe(recurso);

  // Esc fecha. Um modal sem saída de teclado prende quem navega sem mouse.
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') aoFechar?.(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const pagar = async () => {
    setIndo(true);
    setErro('');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro-trimestral' }),
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok || !dados.url) throw new Error(dados.error || 'sem url');
      window.location.href = dados.url;
    } catch {
      // Não volta pro estado inicial: quem falhou uma vez precisa ver o botão
      // pronto pra tentar de novo, e não um spinner parado.
      setErro('Não consegui abrir o pagamento agora. Tenta de novo.');
      setIndo(false);
    }
  };

  return (
    <div className="pg-fundo" onClick={aoFechar} role="presentation">
      <div
        className="pg-cx"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="pg-x" onClick={aoFechar} aria-label="Fechar">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <p className="pg-kicker">plano completo</p>
        <h2 id="pg-titulo" className="pg-titulo">{convite.titulo}</h2>
        <p className="pg-linha">{convite.linha}</p>

        <div className="pg-preco">
          <span className="pg-velho">R$ 296,90</span>
          <span className="pg-off">-70%</span>
          <span className="pg-agora">R$ 89,90</span>
          <span className="pg-dia">R$ 0,99 / dia</span>
        </div>
        <p className="pg-unico">pagamento único · 3 meses de acesso · pix na hora</p>

        <button className="pg-cta" onClick={pagar} disabled={indo}>
          {indo ? 'abrindo o pagamento…' : 'Pagar agora para aprender com a Cady!'}
        </button>
        {erro && <p className="pg-erro">{erro}</p>}

        {/* A saída tem que ser tão visível quanto a compra: o plano grátis é
            uma promessa, e um popup que só oferece pagar a desmente. */}
        <button className="pg-ghost" onClick={aoFechar}>
          agora não — continuar escrevendo de graça
        </button>
      </div>
    </div>
  );
}
