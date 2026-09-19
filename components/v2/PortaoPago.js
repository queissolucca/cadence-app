'use client';

import { useEffect, useState } from 'react';
import { conviteDe } from '../../lib/acesso';
import { PLANS, centavosPorDia } from '../../lib/plans';

const reais = (centavos) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

/* O TRIMESTRAL VEM PRIMEIRO.

   Estava embaixo, na ideia de que a conta por dia dele desmontaria a do de
   cima — mas isso supõe que a pessoa leia as duas antes de decidir. Num popup,
   a primeira opção é a que carrega o peso de "recomendada"; enterrar a que
   você quer vender embaixo da alternativa mais barata é ler contra a corrente.

   O de 7 dias fica logo abaixo, como saída pra quem não quer decidir três
   meses agora. */
const PLANOS = [
  {
    id: 'pro-trimestral',
    nome: '3 meses (90 dias)',
    nota: 'pagamento único · pix na hora',
    acao: 'Quero aprender a partir de agora com a Cady por um preço mais acessível!',
    destaque: true,
    selo: 'melhor por dia',
  },
  {
    id: 'pro-semanal',
    nome: '7 dias',
    nota: 'pra experimentar e sentir como a Cady consegue te ajudar!',
    acao: 'Quero testar por uma semana primeiro!',
  },
].map((p) => {
  const plano = PLANS[p.id];
  return { ...p, preco: reais(plano.price), porDia: reais(centavosPorDia(plano)) };
});

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
  // Guarda QUAL plano está abrindo, não um booleano: com dois botões, um
  // booleano apagaria os dois e a pessoa não saberia em qual tocou.
  const [indo, setIndo] = useState(null);
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

  /* DUAS OFERTAS, E A CONTA POR DIA AO LADO DE CADA UMA.

     R$ 19,90 e R$ 89,90 não se comparam de cabeça: um é menor, o outro dura
     mais. Por dia eles viram R$ 2,84 e R$ 0,99 — a mesma escolha, agora
     legível. O semanal existe pra quem não quer decidir três meses de uma vez;
     é a diferença por dia, à vista, que faz a maioria escolher o outro.

     Os preços NÃO são escritos aqui: vêm de lib/plans.js, que é a fonte que o
     servidor usa pra cobrar. Duas listas de preço divergem no dia em que uma
     muda — e a que a pessoa leu não seria a que ela pagou. */
  const pagar = async (planId) => {
    setIndo(planId);
    setErro('');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok || !dados.url) throw new Error(dados.error || 'sem url');
      window.location.href = dados.url;
    } catch (e) {
      /* `plan_not_configured` tem causa conhecida e conserto conhecido: o
         produto ainda não existe no AbacatePay (ou a env do prod_ não foi
         preenchida). Dizer "tenta de novo" aí manda a pessoa repetir uma ação
         que nunca vai funcionar. */
      setErro(/plan_not_configured/.test(String(e?.message))
        ? 'Esse plano ainda não está disponível. Tenta o outro.'
        : 'Não consegui abrir o pagamento agora. Tenta de novo.');
      setIndo(null);
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

        <p className="pg-kicker">Plano Pro</p>
        <h2 id="pg-titulo" className="pg-titulo">{convite.titulo}</h2>
        <p className="pg-linha">{convite.linha}</p>

        <div className="pg-planos">
          {PLANOS.map((pl) => (
            <button
              key={pl.id}
              className={`pg-plano ${pl.destaque ? 'pg-plano-alvo' : ''}`}
              onClick={() => pagar(pl.id)}
              disabled={!!indo}
            >
              {pl.selo && <span className="pg-selo">{pl.selo}</span>}
              <span className="pg-plano-nome">{pl.nome}</span>
              <span className="pg-plano-preco">
                <b>{pl.preco}</b>
                <i>{pl.porDia} / dia</i>
              </span>
              <span className="pg-plano-nota">{pl.nota}</span>
              <span className="pg-plano-cta">
                {indo === pl.id ? 'abrindo o pagamento…' : pl.acao}
              </span>
            </button>
          ))}
        </div>
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
