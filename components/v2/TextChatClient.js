'use client';

import { useEffect, useRef, useState } from 'react';
import { CadyLive } from './CadyLive';
import { TypingDots } from './TypingDots';

function deriveTitle(messages) {
  const firstYou = messages.find((m) => m.role === 'you' && (m.text || '').trim().split(/\s+/).length >= 2);
  if (firstYou) {
    const words = firstYou.text.trim().split(/\s+/).slice(0, 8).join(' ');
    return words.length > 60 ? `${words.slice(0, 60)}…` : words;
  }
  return `Chat · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

// Conversa aberta por TEXTO — a Cady via Claude (Haiku, barato). Corrige inline,
// salva na Revisão sozinha (tool server-side), e conta streak/histórico igual à
// conversa por voz. Alternativa ao microfone dentro da mesma aba.
/* O CONVITE PRA FALAR, A CADA 5-8 MENSAGENS.

   O Escrever é o plano grátis e o Falar é o pago; quem só digita nunca esbarra
   no microfone sozinho. Este é o empurrãozinho.

   Por que não é o modelo que escreve isso: um LLM não conta turnos. Pedir no
   prompt "a cada 5 a 8 mensagens, convide" dá um convite a cada duas
   mensagens num dia e nenhum no outro — e ainda gasta espaço de prompt numa
   regra que ele não consegue cumprir. Contar turno é trabalho de código.

   O intervalo é sorteado entre 5 e 8 a cada convite, e não fixo em 5, pra não
   virar metrônomo: um aviso que chega sempre na mesma contagem lê como banner,
   e banner o olho aprende a pular.

   O emoji é o MESMO do botão (🎙 em ConversarView), de propósito — o convite
   manda clicar num ícone que está logo acima, e um emoji diferente faria a
   pessoa procurar um botão que não existe. */
const CONVITE_FALAR = 'Seria melhor aprender como falar né? Clique no ícone acima de 🎙 Falar e fale comigo agora!';
const INTERVALO_CONVITE = () => 5 + Math.floor(Math.random() * 4);   // 5, 6, 7 ou 8

/* TETO DE 500 CARACTERES NA CAIXA.

   Duas camadas, de propósito:

   1. `maxLength` no textarea é quem faz o trabalho de verdade. O navegador
      para de aceitar tecla no 501 e TRUNCA colagem — colar 2.000 caracteres
      preenche até 500 e descarta o resto, sem erro e sem limpar o que já
      estava escrito.
   2. O `.slice(0, MAX_CARACTERES)` no onChange é o cinto. `maxLength` é
      atributo de UI: ele não vale pra valor setado por código, e some se
      alguém editar o atributo no inspetor. O slice garante que o ESTADO nunca
      passa de 500, que é o que acaba indo pra API.

   O contador só aparece nos últimos 50 porque a alternativa é pior: caixa que
   simplesmente para de aceitar tecla, sem dizer nada, lê como travamento. E um
   contador visível o tempo todo transforma escrever numa prova com limite. */
const MAX_CARACTERES = 500;
const AVISA_A_PARTIR_DE = 450;

export function TextChatClient({ firstName, agent, onSaved, initialMessages, resumeId, resumeTopic, unit, cardDrill, openingGreeting }) {
  const name = firstName || '';
  const resuming = Array.isArray(initialMessages) && initialMessages.length > 0;
  const greeting = cardDrill
    ? `Quick practice with "${cardDrill.term}"${cardDrill.example ? ` — like: "${cardDrill.example}"` : ''}. Write a sentence using it, something from your own life!`
    : unit
      ? `Alright ${name || 'there'}! Let's nail ${unit.focus}. Here's an example — ${unit.example} Now your turn: write one like that!`
      /* A PRIMEIRA BOLHA DA CONVERSA ABERTA ESCRITA É EM PORTUGUÊS.

         Ela é string do cliente, não saída do modelo — então o system prompt
         não a alcança. Ficar em inglês aqui desmentia a Cady na primeira linha
         da tela: ela abriria dizendo "what do you wanna talk about" pra depois
         escrever tudo em português.

         `openingGreeting` sai de propósito DESTE caminho (e só deste): ele vem
         de /api/conversar/saudacao, é gerado em inglês a partir da memória, e é
         o mesmo valor que alimenta o `opening_line` do agente de voz. Traduzir
         a rota mudaria a abertura da voz de carona, onde quem manda no idioma é
         o prompt do painel do ElevenLabs. O Falar continua com ele intacto.

         O que se perde aqui é a abertura personalizada pela memória, só no
         texto — e a Cady segue sabendo tudo a partir do primeiro turno, porque
         a memória continua indo no system prompt. */
      : `Oi ${name || 'você'}! Eu sou a Cady! Tente escrever em inglês. O importante é tentar e ir aprendendo comigo! Tell me what you did today!`;
  const [messages, setMessages] = useState(
    resuming
      ? initialMessages.map((m) => ({ role: m.role === 'you' ? 'you' : 'coach', text: m.text }))
      : [{ role: 'coach', text: greeting }],
  );
  const faltamPraConvite = useRef(0);   // 0 = ainda não sorteado
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedFlash, setSavedFlash] = useState(0);
  // Rosto da Cady no chat escrito. Aqui não existe áudio, então os estados vêm
  // de eventos do próprio chat: esperando resposta, resposta chegando, e
  // correção — esta última pelo MESMO sinal da voz, o save_to_review com
  // category 'correction' que a /api/chat devolve em `saved`.
  const [respondendo, setRespondendo] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const respT = useRef(null);
  const corrT = useRef(null);
  useEffect(() => () => { clearTimeout(respT.current); clearTimeout(corrT.current); }, []);

  // Ao retomar, escreve na MESMA conversa (anexa o novo trecho).
  const convIdRef = useRef(resuming ? resumeId || null : null);
  const startedAtRef = useRef(Date.now());
  const streakDoneRef = useRef(false);
  const progressDoneRef = useRef(false);
  const userCountRef = useRef(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  // Extrai memória (fatos pessoais) ao SAIR de uma conversa aberta — não em lição.
  const snapRef = useRef({ msgs: messages, users: 0 });
  useEffect(() => {
    snapRef.current = { msgs: messages, users: userCountRef.current };
  }, [messages]);
  useEffect(
    () => () => {
      if (unit || cardDrill) return;
      const { msgs, users } = snapRef.current;
      if (users >= 3 && msgs.length >= 6) {
        fetch('/api/memory/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs }),
        }).catch(() => {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const persist = async (msgs) => {
    if (convIdRef.current) {
      fetch(`/api/conversations/${convIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, ended_at: new Date().toISOString() }),
      }).catch(() => {});
      return;
    }
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs,
          title: unit ? `Lição: ${unit.title}` : deriveTitle(msgs),
          theme: unit ? unit.title : 'Cady · texto',
          started_at: new Date(startedAtRef.current).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
        }),
      });
      if (res.ok) {
        const { id } = await res.json();
        convIdRef.current = id;
        onSaved && onSaved();
      }
    } catch {
      /* noop */
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setErrorMsg('');
    const withYou = [...messages, { role: 'you', text }];
    setMessages(withYou);
    setInput('');
    setSending(true);
    userCountRef.current += 1;

    /* O CONVITE É SÓ TELA. Ele não vai pro modelo nem pro banco.

       Pro modelo: ele chegaria como fala da Cady, e ela passaria a achar que
       convidou — repetindo, ou respondendo ao próprio convite.
       Pro banco: ele entraria no transcript salvo e voltaria no `prior_context`
       de uma retomada, com o mesmo efeito, dias depois.

       Filtrar aqui (e não tirar do `messages`) mantém o convite VISÍVEL na
       conversa. Tirá-lo do estado faria ele sumir da tela no envio seguinte. */
    const paraFora = (lista) => lista.filter((m) => m.role !== 'convite');
    const history = paraFora(withYou).map((m) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          ...(unit ? { unit: { title: unit.title, focus: unit.focus, context: unit.context, drill: unit.drill } } : {}),
          ...(cardDrill ? { cardDrill: { term: cardDrill.term, example: cardDrill.example } } : {}),
        }),
      });
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) throw new Error('chat');
      const { reply, saved } = await res.json();
      const withReply = [...withYou, { role: 'coach', text: reply }];
      setMessages(withReply);

      /* Só na conversa aberta: em lição e em drill de card a pessoa está no
         meio de um exercício, e mandar ela sair no meio é atrapalhar. */
      if (!unit && !cardDrill) {
        if (!faltamPraConvite.current) faltamPraConvite.current = INTERVALO_CONVITE();
        faltamPraConvite.current -= 1;
        if (faltamPraConvite.current <= 0) {
          faltamPraConvite.current = INTERVALO_CONVITE();
          setMessages((atual) => [...atual, { role: 'convite', text: CONVITE_FALAR }]);
        }
      }
      if (Array.isArray(saved) && saved.length) setSavedFlash((n) => n + saved.length);

      // Beat de "acabei de te responder", e a cara brava só se de fato corrigiu.
      setRespondendo(true);
      clearTimeout(respT.current);
      respT.current = setTimeout(() => setRespondendo(false), 2000);
      if (Array.isArray(saved) && saved.some((x) => x?.category === 'correction')) {
        setCorrigindo(true);
        clearTimeout(corrT.current);
        corrT.current = setTimeout(() => setCorrigindo(false), 5200);
      }

      if (!cardDrill) persist(paraFora(withReply)); // drill de card é micro-interação: não salva no histórico
      // Só conta pro streak se foi atividade real: uma lição de fato (>=4 trocas)
      // ou uma conversa aberta com troca real (>=2 mensagens suas). Card drill não conta.
      const streakQualifies = cardDrill ? false : unit ? userCountRef.current >= 4 : userCountRef.current >= 2;
      if (streakQualifies && !streakDoneRef.current) {
        streakDoneRef.current = true;
        const secs = Math.round((Date.now() - startedAtRef.current) / 1000);
        fetch('/api/session/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'roleplay', mode: 'writing', duration_seconds: Math.max(secs, 30) }),
        }).catch(() => {});
      }
      // Lição da trilha por escrita: conta como feita depois de um drill real.
      if (unit?.id && userCountRef.current >= 4 && !progressDoneRef.current) {
        progressDoneRef.current = true;
        fetch('/api/track/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unit.id }),
        }).catch(() => {});
      }
    } catch {
      setErrorMsg('Não consegui responder agora. Tenta de novo.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (notConfigured) {
    return (
      <div className="v2-card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
        <strong style={{ fontSize: 14 }}>Chat de texto ainda não configurado</strong>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
          Falta a chave <code>ANTHROPIC_API_KEY</code> nas variáveis de ambiente do Vercel. Adicione e faça um redeploy.
        </p>
      </div>
    );
  }

  let cara = 'idle';
  if (sending) cara = 'pensando';
  else if (corrigindo && respondendo) cara = 'corrigindo_falando';
  else if (corrigindo) cara = 'corrigindo';
  // Mesmo padrão da conversa por voz: respondendo, ela ri. Aqui não há áudio
  // (`nivel={null}`), então a boca oscila sozinha — e com a rampa de riso ela
  // oscila entre "o" e boca aberta, sem nunca fechar.
  else if (respondendo) cara = 'rindo';

  const legenda = sending ? '· pensando…'
    : corrigindo ? '· corrigindo você'
    : '· escrevendo com você';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 620, margin: '0 auto', gap: 12 }}>
      {/* A Cady miniatura: a mesma de sempre, só menor. Aqui ela não fala, então
          o rosto conta o que está acontecendo no chat — pensando enquanto a
          resposta não chega, respondendo quando chega, brava quando corrigiu.
          `nivel={null}` avisa que não há áudio pra seguir. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center' }}>
        <CadyLive estado={cara} nivel={null} falando={respondendo} size={62} label={agent?.name || 'Cady'} />
        <span style={{ fontSize: 14, color: 'var(--ink)' }}>
          <strong>{agent?.name || 'Cady'}</strong>{' '}
          <span style={{ color: 'var(--ink-soft)' }}>{legenda}</span>
        </span>
      </div>

      {resuming && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-2" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Continuando: {resumeTopic || 'sua conversa'}</span>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          /* ALTURA QUE CABE NA TELA, E SÓ ELA ROLA.

             O número descontado é o ORÇAMENTO DO QUE NÃO É A CONVERSA. Ele já
             esteve em `min(56vh, 460px)` (errado: no Safari do iPhone `100vh`
             é o viewport EXPANDIDO, maior do que se enxerga com a barra à
             mostra) e depois em 430px, chutado. 430 era pouco: o campo de
             digitar ficava abaixo da dobra e a pessoa tinha que rolar a página
             pra achar onde escrever.

             Agora é somado, elemento por elemento, no mobile (<=860px):

               24   .web-main padding-top
               33   h1 "Conversar" (26px)
               62   parágrafo de 3 linhas + margens (6 em cima, 4 embaixo)
               26   gap do .web-main-inner
               34   botão "Agentes & histórico"
               14   gap do .conv-shell
               12   padding-top do .conv-live
               48   par Escrever/Falar + sua margem
               62   a Cady miniatura e o nome
               12   gap até a caixa
              ----
               327  acima da caixa

               12   gap depois da caixa
               46   campo de digitar + botão de enviar
               96   .web-main padding-bottom (reserva da tabbar fixa)
              ----
               154  abaixo da caixa

             481 no total; 500 pra ter folga, porque o parágrafo pode quebrar em
             4 linhas em tela estreita e a tabbar tem ~30px de sobra dentro
             daqueles 96.

             O teto caiu de 400 pra 380: em celular alto o `calc` nem chega no
             teto, mas 380 garante que a caixa não volte a dominar a tela.

             O piso de 180px existe pra tela curta não virar uma fresta —
             abaixo dele a página volta a rolar, que é o mal menor. Num iPhone
             SE ainda rola; caber lá exigiria encurtar o título e o parágrafo,
             que são conteúdo, não folga. */
          height: 'clamp(180px, calc(100dvh - 500px), 380px)',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          /* A rolagem para AQUI: sem isto, chegar ao fim da conversa continua
             rolando a página atrás, e a tela inteira se mexe. */
          overscrollBehavior: 'contain',
          padding: '12px', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--v2-card-bg)',
        }}
      >
        {messages.map((line, i) => (
          line.role === 'convite' ? (
            /* Borda verde e largura cheia: o convite não é um turno da conversa,
               é a tela falando. Com a mesma cara de bolha da Cady, ele entraria
               no fluxo de leitura e a pessoa responderia a ele. */
            <div
              key={i}
              style={{
                alignSelf: 'stretch', fontSize: 13.5, lineHeight: 1.45,
                background: 'var(--green-soft)', color: 'var(--green-dark, var(--green))',
                border: '1px solid var(--green)', borderRadius: 12,
                padding: '9px 12px', textAlign: 'center', fontWeight: 600,
              }}
            >
              {line.text}
            </div>
          ) : (
          <div
            key={i}
            style={{
              alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
              maxWidth: '85%', fontSize: 14.5, lineHeight: 1.5,
              background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)',
              color: line.role === 'you' ? 'var(--ink)' : 'var(--v2-card-fg)',
              border: line.role === 'you' ? 'none' : '1px solid var(--line)',
              borderRadius: 14, padding: '9px 13px', whiteSpace: 'pre-wrap',
            }}
          >
            {line.text}
          </div>
          )
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', padding: '4px 4px' }}>
            <TypingDots label={agent?.name || 'Cady'} />
          </div>
        )}
      </div>

      {savedFlash > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'center', fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '5px 12px', borderRadius: 999 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {savedFlash} {savedFlash === 1 ? 'item guardado' : 'itens guardados'} na Revisão
        </div>
      )}

      {errorMsg && <p style={{ margin: 0, fontSize: 13, color: 'var(--red, #c0392b)', textAlign: 'center' }}>{errorMsg}</p>}

      {input.length >= AVISA_A_PARTIR_DE && (
        <p style={{
          margin: '0 56px 0 0', fontSize: 12, textAlign: 'right',
          color: input.length >= MAX_CARACTERES ? 'var(--red, #c0392b)' : 'var(--ink-soft)',
        }}>
          {input.length === MAX_CARACTERES
            ? 'Limite de 500 caracteres. Manda esse e continua no próximo!'
            : `${MAX_CARACTERES - input.length} caracteres restantes`}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CARACTERES))}
          onKeyDown={onKeyDown}
          maxLength={MAX_CARACTERES}
          rows={1}
          placeholder="Escreva aqui... (tente escrever em inglês para começar a praticar)"
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--line)', borderRadius: 14, padding: '11px 14px',
            fontSize: 14.5, lineHeight: 1.4, color: 'var(--v2-card-fg, var(--ink))', background: 'var(--v2-card-bg)',
            maxHeight: 120, fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Enviar"
          style={{
            width: 46, height: 46, borderRadius: 14, border: 'none', flexShrink: 0,
            cursor: sending || !input.trim() ? 'default' : 'pointer',
            background: sending || !input.trim() ? 'var(--line)' : 'var(--green)', color: '#fff',
            display: 'grid', placeItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    </div>
  );
}
