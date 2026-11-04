'use client';

import { useEffect, useRef, useState } from 'react';
import { conviteDe } from '../../lib/acesso';
import { PLANS, centavosPorDia } from '../../lib/plans';

const reais = (centavos) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

/* O TRIMESTRAL VEM PRIMEIRO.

   Estava embaixo, na ideia de que a conta por dia dele desmontaria a do de
   cima — mas isso supõe que a pessoa leia as duas antes de decidir. Num popup,
   a primeira opção é a que carrega o peso de "recomendada"; enterrar a que
   você quer vender embaixo da alternativa mais barata é ler contra a corrente.

   O mensal fica logo abaixo, no lugar que era do semanal: a saída pra quem
   não quer decidir três meses agora — e, diferente do semanal, não exige
   voltar aqui toda semana pra continuar. */
const PLANOS = [
  {
    id: 'pro-trimestral',
    nome: '3 meses (90 dias)',
    nota: 'pagamento único · pix ou cartão em até 8x',
    acao: 'Quero aprender a partir de agora com a Cady por um preço mais acessível!',
    destaque: true,
    selo: 'melhor por dia',
  },
  {
    id: 'pro-mensal',
    nome: 'Mensal',
    nota: 'renova todo mês · Pix Automático ou cartão · cancele quando quiser',
    acao: 'Prefiro assinar mês a mês',
  },
].map((p) => {
  const plano = PLANS[p.id];
  return { ...p, preco: reais(plano.price), porDia: reais(centavosPorDia(plano)) };
});

const MENSAL = PLANS['pro-mensal'];

// 000.000.000-00 enquanto digita; passa de 11 dígitos, vira máscara de CNPJ.
function mascaraDoc(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/* O POPUP DO PLANO COMPLETO.

   Aparece quando alguém do plano grátis toca em falar ou na trilha. Ele NÃO é
   o portão: quem barra de verdade é o middleware, na API, e um popup se fecha
   no inspetor. Isto aqui é a explicação — o portão sozinho devolve 402, que
   não diz nada a ninguém.

   Por que ele é modal e não uma página: a pessoa estava fazendo uma coisa.
   Tirá-la da tela pra mostrar preço faz ela perder o lugar, e voltar depois
   custa mais do que ela quer pagar por uma curiosidade. Fechando o popup, ela
   continua exatamente onde estava — escrevendo, que é de graça.

   É também a LOJA de quem tem conta: o /pagamento manda logado pro /v2 (só
   anônimo vê aquela vitrine). Por isso o Pix Automático — que mostra o QR Code
   na nossa tela, não numa página do Asaas — acontece aqui dentro, em etapas:

     planos → (mensal) metodo → [cpf, só na 1ª vez] → qr → pago */

export function PortaoPago({ recurso, aberto, aoFechar }) {
  // Guarda QUAL plano está abrindo, não um booleano: com dois botões, um
  // booleano apagaria os dois e a pessoa não saberia em qual tocou.
  const [indo, setIndo] = useState(null);
  const [erro, setErro] = useState('');
  const [etapa, setEtapa] = useState('planos');
  const [doc, setDoc] = useState('');
  const [pix, setPix] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const convite = conviteDe(recurso);

  // Reabrir começa do começo. O componente fica montado entre aberturas (só
  // devolve null), e sem isto a pessoa reabriria no meio de um QR vencido.
  useEffect(() => {
    if (aberto) { setEtapa('planos'); setErro(''); setIndo(null); setPix(null); setCopiado(false); }
  }, [aberto]);

  // Esc fecha. Um modal sem saída de teclado prende quem navega sem mouse.
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') aoFechar?.(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, aoFechar]);

  /* ESPERANDO O PIX CAIR.

     O QR Code paga o 1º mês; quem libera o acesso é o webhook, segundos
     depois. A mesma consulta que o /obrigado faz, a cada 3s, enquanto o QR
     estiver na tela — e por no máximo 1h, que é quando ele vence. */
  const inicio = useRef(0);
  useEffect(() => {
    if (!aberto || etapa !== 'qr') return undefined;
    inicio.current = Date.now();
    let parou = false;
    let timer = null;
    const bate = async () => {
      try {
        const r = await fetch('/api/checkout/status', { cache: 'no-store' });
        const d = await r.json();
        if (!parou && d.active) { setEtapa('pago'); return; }
      } catch { /* tenta de novo */ }
      if (!parou && Date.now() - inicio.current < 60 * 60 * 1000) timer = setTimeout(bate, 3000);
    };
    timer = setTimeout(bate, 3000);
    return () => { parou = true; clearTimeout(timer); };
  }, [aberto, etapa]);

  if (!aberto) return null;

  /* DUAS OFERTAS, E A CONTA POR DIA AO LADO DE CADA UMA.

     R$ 39,90 por mês e R$ 89,90 por três não se comparam de cabeça. Por dia
     eles viram R$ 1,33 e R$ 0,99 — a mesma escolha, agora legível.

     Os preços NÃO são escritos aqui: vêm de lib/plans.js, que é a fonte que o
     servidor usa pra cobrar. Duas listas de preço divergem no dia em que uma
     muda — e a que a pessoa leu não seria a que ela pagou. */
  const abrirCheckout = async (planId) => {
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
      /* `plan_not_configured` tem causa conhecida e conserto conhecido: a
         chave do Asaas não está na Vercel. Dizer "tenta de novo" aí manda a
         pessoa repetir uma ação que nunca vai funcionar. */
      setErro(/plan_not_configured/.test(String(e?.message))
        ? 'O pagamento ainda não está disponível. Volta daqui a pouco?'
        : 'Não consegui abrir o pagamento agora. Tenta de novo.');
      setIndo(null);
    }
  };

  // O mensal pergunta COMO antes de cobrar; o trimestral vai direto.
  const pagar = (planId) => {
    if (planId === 'pro-mensal') { setErro(''); setEtapa('metodo'); return; }
    abrirCheckout(planId);
  };

  /* Pede o QR Code. Sem CPF na primeira tentativa: quem já gerou um Pix antes
     tem o cliente criado no Asaas e não precisa digitar de novo. O servidor
     responde `cpf_required` quando precisa. */
  const gerarPix = async (cpf) => {
    setIndo('pix');
    setErro('');
    try {
      const r = await fetch('/api/checkout/pix-automatico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpf ? { cpf } : {}),
      });
      const dados = await r.json().catch(() => ({}));
      if (r.status === 422 && dados.error === 'cpf_required') { setEtapa('cpf'); setIndo(null); return; }
      if (dados.error === 'cpf_invalido') { setEtapa('cpf'); setErro('Esse CPF não passou. Confere os números?'); setIndo(null); return; }
      if (!r.ok || (!dados.imagem && !dados.copiaECola)) throw new Error(dados.error || 'sem qr');
      setPix(dados);
      setEtapa('qr');
    } catch {
      setErro('Não consegui gerar o Pix agora. Tenta de novo, ou assina no cartão.');
    }
    setIndo(null);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pix?.copiaECola || '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* sem clipboard: o código está visível pra copiar à mão */ }
  };

  const docDigitos = doc.replace(/\D/g, '');

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

        {etapa === 'planos' && (
          <>
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
          </>
        )}

        {etapa === 'metodo' && (
          <>
            <p className="pg-kicker">Mensal · {reais(MENSAL.price)} por mês</p>
            <h2 id="pg-titulo" className="pg-titulo">Como você prefere pagar todo mês?</h2>
            <p className="pg-linha">Renova sozinho e dá pra cancelar quando quiser, no seu Perfil. O que você já pagou continua valendo até o fim do mês.</p>
            <div className="pg-planos">
              <button className="pg-plano pg-plano-alvo" onClick={() => gerarPix(null)} disabled={!!indo}>
                <span className="pg-plano-nome">Pix Automático</span>
                <span className="pg-plano-nota">Você paga o 1º mês e autoriza os próximos no app do seu banco, num QR Code só. Sem cartão.</span>
                <span className="pg-plano-cta">{indo === 'pix' ? 'gerando o QR Code…' : 'Pagar com Pix'}</span>
              </button>
              <button className="pg-plano" onClick={() => abrirCheckout('pro-mensal')} disabled={!!indo}>
                <span className="pg-plano-nome">Cartão de crédito</span>
                <span className="pg-plano-nota">Cobrança mensal no cartão, numa página segura do Asaas.</span>
                <span className="pg-plano-cta">{indo === 'pro-mensal' ? 'abrindo o pagamento…' : 'Pagar com cartão'}</span>
              </button>
            </div>
          </>
        )}

        {etapa === 'cpf' && (
          <form onSubmit={(e) => { e.preventDefault(); if (docDigitos.length >= 11) gerarPix(docDigitos); }}>
            <p className="pg-kicker">Pix Automático</p>
            <h2 id="pg-titulo" className="pg-titulo">Qual é o seu CPF?</h2>
            <p className="pg-linha">A cobrança Pix precisa dele. É só desta vez — nas próximas, a gente já tem.</p>
            <input
              className="pg-campo"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              aria-label="CPF"
              value={doc}
              onChange={(e) => setDoc(mascaraDoc(e.target.value))}
              autoFocus
            />
            <button type="submit" className="pg-cta" style={{ marginTop: 12 }} disabled={!!indo || docDigitos.length < 11}>
              {indo === 'pix' ? 'gerando o QR Code…' : 'gerar QR Code'}
            </button>
          </form>
        )}

        {etapa === 'qr' && pix && (
          <>
            <p className="pg-kicker">Pix Automático · {reais(MENSAL.price)} por mês</p>
            <h2 id="pg-titulo" className="pg-titulo">Paga no app do seu banco</h2>
            <p className="pg-linha">Escaneia o QR Code ou copia o código. O banco vai pedir pra você <strong>pagar o 1º mês</strong> e <strong>autorizar os próximos</strong> — é uma tela só.</p>
            {pix.imagem && (
              <div className="pg-qr">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pix.imagem} alt="QR Code do Pix Automático" width={220} height={220} />
              </div>
            )}
            {pix.copiaECola && (
              <button className="pg-cta" onClick={copiar}>
                {copiado ? 'código copiado ✓' : 'copiar código Pix'}
              </button>
            )}
            <p className="pg-espera">
              <span className="pg-pulso" aria-hidden="true" />
              esperando o pagamento… esta tela muda sozinha quando cair
            </p>
          </>
        )}

        {etapa === 'pago' && (
          <>
            <p className="pg-kicker">Pagamento confirmado</p>
            <h2 id="pg-titulo" className="pg-titulo">Pronto, seu plano Pro está ativo.</h2>
            <p className="pg-linha">O próximo mês o seu banco debita sozinho. Pra cancelar, é no seu Perfil, em Assinatura.</p>
            {/* Recarrega pra todo o app (cadeado da Trilha, botão de Falar) ler
                o acesso novo do servidor. */}
            <button className="pg-cta" onClick={() => window.location.reload()}>continuar</button>
          </>
        )}

        {erro && <p className="pg-erro">{erro}</p>}

        {etapa === 'planos' ? (
          /* A saída tem que ser tão visível quanto a compra: o plano grátis é
             uma promessa, e um popup que só oferece pagar a desmente. */
          <button className="pg-ghost" onClick={aoFechar}>
            agora não — continuar escrevendo de graça
          </button>
        ) : etapa !== 'pago' && (
          <button className="pg-ghost" onClick={() => { setErro(''); setEtapa(etapa === 'metodo' ? 'planos' : 'metodo'); }}>
            ← voltar
          </button>
        )}
      </div>
    </div>
  );
}
