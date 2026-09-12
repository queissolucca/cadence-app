'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { CadyLive } from './CadyLive';
import { aoTocarMute, decidirMute } from '../../lib/conversaMute';
import { contextoDeRetomada, deveRetomar } from '../../lib/retomada';

// Título curtinho pra listar na barra lateral: pega a 1ª fala do usuário com
// substância; senão, cai pra data.
function deriveTitle(messages) {
  const firstYou = messages.find((m) => m.role === 'you' && (m.text || '').trim().split(/\s+/).length >= 3);
  if (firstYou) {
    const words = firstYou.text.trim().split(/\s+/).slice(0, 8).join(' ');
    return words.length > 60 ? `${words.slice(0, 60)}…` : words;
  }
  return `Conversa · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

/* Quanto tempo uma reação fica no rosto. 3,8s: abaixo de ~3s a expressão passa
   rápido demais pra ser lida como reação (a pessoa vê "mudou alguma coisa" e
   não o quê), e acima de ~5s ela para de parecer resposta a algo e vira o
   humor padrão dela. */
const REACAO_MS = 3800;

// Qual reação ganha de qual, quando as duas chegam dentro da trava. Corrigir é
// mais urgente que elogiar: perder um elogio custa carinho, perder uma correção
// custa a aula.
const FORCA = { elogiando: 1, corrigindo: 2 };

function ConversationInner({ firstName, onSaved, onEncerrada, agent, resumeContext, resumeTopic, resumeMessages, resumeId, unit, reviewItems, memoryText, cardDrill, openingGreeting }) {
  const isReview = Array.isArray(reviewItems) && reviewItems.length > 0;
  const isCard = !!(cardDrill && cardDrill.term); // drill relâmpago de 1 card da Revisão
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(true); // aberta por padrão; usuário pode minimizar
  /* A AMPLITUDE DA VOZ DELA NÃO É ESTADO DE REACT.

     Isto era `useState` atualizado dentro de um requestAnimationFrame — um
     setState por quadro durante toda a fala da Cady. Custava menos do que
     parece, e por um motivo constrangedor: o valor era SEMPRE zero (ver o
     comentário do vivoRef — a closure lia um `isSpeaking` congelado), e o React
     descarta um setState que repete o valor anterior. Ou seja, o loop rodava
     60 vezes por segundo pra não fazer nada, e a boca ficava parada.

     Consertar só a closure teria transformado isso no problema que ele
     aparentava ser: aí sim um render por quadro, arrastando junto a lista da
     transcrição, que CRESCE a conversa toda — num celular, a thread principal
     (onde rodam microfone, playback e WebSocket) pagaria a conta, e pagaria
     cada vez mais cara conforme a conversa avança.

     O CadyLive já lia este número num ref dentro do loop dele; o estado só
     servia pra empurrar o valor pela prop. Com o ref, a boca ganha vida e
     ninguém re-renderiza por causa dela. */
  const nivelRef = useRef(0);
  /* UMA REAÇÃO POR VEZ, E ELA DURA O SUFICIENTE PRA SER VISTA.

     Antes só existia a cara brava, e ela era ligada com um `setTimeout` solto.
     Duas coisas estavam erradas nisso:

     1. Só a correção virava cara. Salvar uma frase boa — que é a Cady
        APROVANDO — não mudava nada, e o estado `elogiando` existia no catálogo
        sem ninguém nunca usar.
     2. Uma reação nova reiniciava o relógio da anterior sem critério. Duas
        correções seguidas e a primeira cara sumia antes de alguém ver.

     Agora é um slot só, com prioridade e tempo mínimo: a reação fica 3,8s no
     rosto e, dentro desse tempo, só é substituída por uma MAIS forte (corrigir
     ganha de elogiar). Abaixo de ~3s uma expressão passa como glitch — a pessoa
     vê o rosto mudar mas não consegue dizer pra quê. */
  const [reacao, setReacao] = useState(null);   // null | 'elogiando' | 'corrigindo'
  const reacaoT = useRef(null);
  const reacaoAte = useRef(0);
  useEffect(() => () => clearTimeout(reacaoT.current), []);
  const reagir = useCallback((tipo) => {
    if (!FORCA[tipo]) return;
    const agora = Date.now();
    // Dentro da trava, só entra quem é mais forte que quem já está no rosto.
    setReacao((atual) => {
      if (atual && agora < reacaoAte.current && FORCA[tipo] <= FORCA[atual]) return atual;
      reacaoAte.current = agora + REACAO_MS;
      clearTimeout(reacaoT.current);
      reacaoT.current = setTimeout(() => setReacao(null), REACAO_MS);
      return tipo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startedAtRef = useRef(null);
  /* Quem encerrou: a pessoa ou a conexão? Sem isto, os dois casos são idênticos
     — a tela volta pro repouso calada — e quem caiu no meio da conversa não tem
     como saber se foi ela que encostou no botão ou se o produto desistiu. */
  const pediuParar = useRef(false);
  // Último relato de uso de contexto do LLM (ver onContextUsage).
  const usoDeContexto = useRef(null);
  const messagesRef = useRef([]); // fonte da verdade pro save (closures não ficam stale)
  const scrollRef = useRef(null); // janela de transcrição com scroll próprio
  const inicioTotal = useRef(null);   // início da conversa INTEIRA (retomada automática não reinicia)
  const ultimaFalaEm = useRef(0);     // pra enxergar conversa parada com o socket ainda vivo

  /* SALVAR SÓ NO FIM É NÃO SALVAR.

     O histórico inteiro dependia do `onDisconnect`: gravava quando a conversa
     terminava, e só então. Basta ela não terminar direito — a aba fechada, o
     celular bloqueado, a página recarregada, ou a conversa travando com o socket
     ainda aberto — pra não existir nada. O sintoma não é "salvou errado", é
     "conversas salvas está vazia", que foi exatamente o relato.

     O chat de TEXTO nunca teve esse problema, e a diferença entre os dois é toda
     a pista: ele grava a cada turno (insert no primeiro, update nos seguintes).
     A voz passa a fazer igual. O `onDisconnect` deixa de ser o único instante em
     que o histórico existe e vira só o fecho — duração, streak, memória.

     `idDaConversa` é ref, e não estado, porque é ele que decide entre CRIAR e
     ATUALIZAR: se ele dependesse de render, dois saves próximos criariam duas
     linhas pra mesma conversa. */
  const idDaConversa = useRef(resumeId || null);
  const salvandoAgora = useRef(false);
  const emVoo = useRef(null);      // a gravação em andamento, pro fecho poder esperar por ela
  const salvoAte = useRef(0);      // quantas falas já estão gravadas


  /* RETOMADA AUTOMÁTICA — o estado e os limites. A regra de quando retomar está
     no onDisconnect, que é onde a informação chega. */
  const retomadas = useRef(0);
  const retomandoRef = useRef(false);
  const [retomando, setRetomando] = useState(false);
  const timerRetomada = useRef(null);
  const startRef = useRef(null);   // `start` só existe mais abaixo; o ref fura a ordem
  useEffect(() => () => clearTimeout(timerRetomada.current), []);

  /* Enquanto a conversa está aberta, o id que vale é o do ref — a prop só manda
     antes de começar. Sem esta guarda, o `setResume(null)` que a tela faz assim
     que a conversa aparece na barra lateral zeraria o id NO MEIO da conversa, e
     o save seguinte criaria uma segunda linha pra mesma conversa. */
  useEffect(() => {
    if (startedAtRef.current) return;
    idDaConversa.current = resumeId || null;
    salvoAte.current = 0;
  }, [resumeId]);

  /* Um save que falha não pode ser invisível. A resposta era descartada
     (`.catch(() => {})` e um `.then` que nem olhava o status), então um 401, um
     402 ou o 503 do portão de API sumiam sem deixar rastro — e a conversa
     simplesmente não aparecia na lista, sem nada dizendo por quê. */
  const avisarQueNaoSalvou = useCallback((status) => {
    try {
      window.cadenceTrack?.('conversa_nao_salvou', { status, turnos: messagesRef.current.length });
    } catch {
      /* noop */
    }
  }, []);

  /* Grava a conversa. Cria na primeira fala, atualiza nas seguintes.
     `fim` = é o fecho (grava duração e avisa a tela).
     `aoSair` = a aba está fechando, então a requisição precisa sobreviver a ela. */
  const persistir = useCallback(async ({ fim = false, aoSair = false } = {}) => {
    if (isCard) return;                        // drill relâmpago não vira histórico
    if (!messagesRef.current.length) return;
    if (!fim && messagesRef.current.length === salvoAte.current) return;   // nada novo
    if (salvandoAgora.current) {
      if (!fim) return;                        // já tem um em voo, e não é o fecho
      /* O fecho ESPERA o que está em voo. Sem isto, um PATCH que saiu antes —
         com menos falas e sem duração — pode aterrissar depois e apagar
         justamente o campo que alimenta o streak. Deixar as duas escritas
         correndo soltas é trocar um bug visível por um invisível. */
      try { await emVoo.current; } catch { /* o fecho grava de novo de qualquer jeito */ }
    }
    salvandoAgora.current = true;
    let liberar = () => {};
    emVoo.current = new Promise((resolver) => { liberar = resolver; });
    // Relido DEPOIS da espera: durante ela pode ter entrado mais uma fala.
    const messages = messagesRef.current;
    const alvo = messages.length;
    const inicio = inicioTotal.current || startedAtRef.current || Date.now();
    const segundos = Math.round((Date.now() - inicio) / 1000);
    /* O título só fica bom no FIM. Ele sai da primeira fala do usuário com
       substância (deriveTitle), e no primeiro save a conversa costuma ter só a
       saudação da Cady — daria "Conversa · 12 set" pra sempre. Gravar turno a
       turno sem isto trocaria "não salva nada" por "salva tudo sem nome". Lição
       e revisão têm título fixo e não entram. */
    const corpo = JSON.stringify({
      messages,
      ended_at: new Date().toISOString(),
      ...(fim ? { duration_seconds: segundos } : {}),
      ...(fim && !unit && !isReview ? { title: deriveTitle(messages) } : {}),
    });
    /* `keepalive` é o que deixa a requisição sobreviver ao fechamento da aba,
       mas o navegador limita o corpo a 64KB. Transcrição longa não cabe — e não
       precisa caber: as falas anteriores já foram gravadas turno a turno, então
       o pior caso aqui é perder o último trecho, não a conversa. */
    const keepalive = aoSair && corpo.length < 60000;
    try {
      if (idDaConversa.current) {
        const r = await fetch(`/api/conversations/${idDaConversa.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: corpo,
          keepalive,
        });
        if (!r.ok) { avisarQueNaoSalvou(r.status); return; }
        salvoAte.current = alvo;
        if (fim && onSaved) onSaved();
      } else {
        const r = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            title: unit ? `Lição: ${unit.title}` : isReview ? 'Revisão com a Cady' : deriveTitle(messages),
            theme: unit ? unit.title : isReview ? 'Revisão' : agent?.name || null,
            started_at: new Date(inicio).toISOString(),
            ended_at: new Date().toISOString(),
            duration_seconds: segundos,
          }),
          keepalive,
        });
        if (!r.ok) { avisarQueNaoSalvou(r.status); return; }
        const { id } = await r.json();
        idDaConversa.current = id;
        salvoAte.current = alvo;
        /* A barra lateral passa a mostrar a conversa ENQUANTO ela acontece. Além
           de ser a prova visível de que gravou, é o que faz "conversas salvas"
           deixar de ser uma promessa pro fim da conversa. */
        if (onSaved) onSaved();
      }
    } catch {
      /* rede oscilando: a próxima fala tenta de novo */
    } finally {
      salvandoAgora.current = false;
      liberar();
    }
  }, [isCard, unit, isReview, agent, onSaved, avisarQueNaoSalvou]);

  const conversation = useConversation({
    onConnect: () => {
      startedAtRef.current = Date.now();
      ultimaFalaEm.current = Date.now();
      setErrorMsg('');
      /* Retomada automática (o agente derrubou e a gente reabriu): é a MESMA
         conversa. Zerar o transcript aqui apagaria da tela — e do save — tudo o
         que já tinha sido dito, que é justamente o que a retomada existe pra
         preservar. */
      if (retomandoRef.current) {
        retomandoRef.current = false;
        setRetomando(false);
        return;
      }
      // Conversa nova (ou retomada pedida pela pessoa): a transcrição começa com
      // o histórico antigo, e as falas novas entram por cima.
      const base = Array.isArray(resumeMessages) ? resumeMessages : [];
      messagesRef.current = base;
      setTranscript(base);
      inicioTotal.current = Date.now();
      salvoAte.current = 0;
      retomadas.current = 0;
    },
    onDisconnect: (detalhes) => {
      const inicioDoTrecho = startedAtRef.current;
      startedAtRef.current = null;
      const messages = messagesRef.current;

      /* POR QUE A CONVERSA ACABOU — o SDK diz, e a gente jogava fora.

         `onDisconnect` recebe um objeto com `reason` ('user' | 'agent' |
         'error'), e nos dois últimos casos ainda traz `closeCode`,
         `closeReason` e `message`. Ignorar isso é o motivo de "ela para do
         nada" ter ficado sem explicação por tanto tempo: os três desfechos
         chegavam na tela como a mesma coisa — o repouso, calado.

         A distinção que mais importa é `agent`: quando o motivo é esse, quem
         encerrou foi o AGENTE. Ou seja, o limite está na configuração do
         ElevenLabs (duração máxima da conversa, a ferramenta End Call, o
         contexto do LLM) — e não em nada que este arquivo consiga impedir. O que
         ele PODE fazer é não aceitar esse fim: ver a retomada, mais abaixo. */
      const motivo = detalhes?.reason || (pediuParar.current ? 'user' : 'desconhecido');
      const pedido = motivo === 'user' || pediuParar.current;
      pediuParar.current = false;

      if (!pedido) {
        try {
          window.cadenceTrack?.('voz_encerrada', {
            motivo,
            closeCode: detalhes?.closeCode ?? null,
            closeReason: detalhes?.closeReason ?? null,
            mensagem: typeof detalhes?.message === 'string' ? detalhes.message.slice(0, 300) : null,
            turnos: messages.length,
            segundos: inicioDoTrecho ? Math.round((Date.now() - inicioDoTrecho) / 1000) : 0,
            retomadas: retomadas.current,
            agente: agent?.id || null,
            contexto: usoDeContexto.current,
          });
        } catch {
          /* telemetria nunca atrapalha a conversa */
        }
      }

      if (!inicioDoTrecho) return;  // nunca chegou a conectar: não há conversa
      const segundos = Math.round((Date.now() - (inicioTotal.current || inicioDoTrecho)) / 1000);
      const duracaoDoTrecho = Date.now() - inicioDoTrecho;

      // Drill relâmpago de 1 card: micro-interação — não salva histórico, não
      // conta streak, não extrai memória.
      if (isCard) return;

      /* A CONVERSA ABERTA NÃO ACABA PORQUE O AGENTE ACHOU QUE ACABOU.

         Se o motivo foi 'agent' ou 'error', quem desligou não foi a pessoa — ela
         estava no meio de uma frase. O teto de duração da conversa no ElevenLabs
         (o default da plataforma é 300s), a ferramenta End Call disparada por
         engano, um erro do lado de lá: nenhum desses é uma decisão de quem está
         falando, e todos chegam aqui idênticos a "acabou".

         Então a gente reabre a sessão sozinho e continua: mesmo transcript,
         mesma linha no banco, e o que já foi dito vai junto no `prior_context`
         pra Cady não recomeçar do "oi". Da cadeira de quem fala, a conversa não
         terminou — que é literalmente o que foi pedido, conversa aberta durando
         mais.

         Quando NÃO se retoma (lição, revisão, conversa que caiu logo no começo,
         teto de retomadas) está em lib/retomada.js — são casos de borda demais
         pra morarem dentro de uma callback que nenhum teste alcança. */
      const aberta = !unit && !isReview;
      if (deveRetomar({
        motivo,
        pedido,
        aberta,
        falas: messages.length,
        duracaoMs: duracaoDoTrecho,
        jaRetomou: retomadas.current,
      })) {
        retomadas.current += 1;
        retomandoRef.current = true;
        setRetomando(true);
        setErrorMsg('');
        persistir();   // o que já foi dito fica gravado ANTES de reabrir
        clearTimeout(timerRetomada.current);
        timerRetomada.current = setTimeout(() => {
          if (startRef.current) startRef.current({ automatico: true });
        }, 700);
        return;
      }

      if (!pedido) {
        setErrorMsg(motivo === 'agent'
          ? 'A conversa foi encerrada pelo agente de voz. Toque pra recomeçar — o que vocês já falaram está salvo.'
          : 'A conexão caiu. Toque pra continuar — o que vocês já falaram está salvo.');
      }

      // O fecho do que já vinha sendo gravado turno a turno: duração e ended_at.
      persistir({ fim: true });

      // Só conta pro streak/calendário se foi atividade real: uma lição ou uma
      // revisão que rodou (>=30s = um exercício de fato) OU conversa aberta
      // acima de 1 minuto. Aberturas de poucos segundos não contam.
      const qualifies = unit ? segundos >= 30 : isReview ? segundos >= 30 : segundos >= 60;
      if (qualifies) {
        fetch('/api/session/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'roleplay', mode: 'speaking', duration_seconds: segundos }),
        }).catch(() => {});
      }

      // Progresso da trilha: a lição conta como feita se rodou de verdade (>=30s).
      if (unit?.id && segundos >= 30) {
        fetch('/api/track/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unit_id: unit.id }),
        }).catch(() => {});
      }

      // Revisão falada: os cards treinados sobem de caixa (conta como acerto).
      if (isReview && segundos >= 20) {
        fetch('/api/review/practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: reviewItems.map((it) => it.id).filter(Boolean) }),
        }).catch(() => {});
      }

      // Conversa aberta: extrai memória (fatos pessoais) ao encerrar — 1 chamada
      // Haiku, best-effort. Não roda em lição/revisão.
      if (aberta && messages.length >= 6) {
        fetch('/api/memory/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
        }).catch(() => {});
      }

      if (onEncerrada) onEncerrada();
    },
    onMessage: (msg) => {
      const text = msg?.message ?? msg?.text;
      if (!text) return;
      const role = msg?.source === 'user' ? 'you' : 'coach';
      const line = { role, text, at: new Date().toISOString() };
      messagesRef.current = [...messagesRef.current, line];
      ultimaFalaEm.current = Date.now();
      setTranscript((t) => [...t, line]);
    },
    onError: (mensagem, contexto) => {
      setErrorMsg('Algo deu errado na conexão de voz. Tenta de novo.');
      try {
        window.cadenceTrack?.('voz_erro', {
          mensagem: typeof mensagem === 'string' ? mensagem.slice(0, 300) : null,
          contexto: contexto ? String(contexto).slice(0, 200) : null,
        });
      } catch { /* noop */ }
    },
    /* Quanto do contexto do LLM já foi usado. É a medida DIRETA de uma das
       suspeitas — o system prompt somado ao `prior_context` (que pode ter ~4500
       caracteres) e à memória do usuário pode encher a janela em poucos turnos,
       e um modelo sem espaço para de responder. Guardado num ref e mandado
       junto no encerramento: assim dá pra ver se a conversa morreu cheia. */
    onContextUsage: (uso) => { usoDeContexto.current = uso || null; },
    /* O agente pedindo uma ferramenta que este app não declara. O SDK responde
       "not defined on client" e a conversa segue torta — a Cady acha que salvou
       algo que nunca foi salvo, ou fica esperando um efeito que não vem. Só o
       painel do ElevenLabs pode criar essa situação, então ela precisa aparecer
       aqui pra alguém saber que existe. */
    onUnhandledClientToolCall: (chamada) => {
      try {
        window.cadenceTrack?.('voz_tool_desconhecida', {
          ferramenta: chamada?.tool_name || null,
          agente: agent?.id || null,
        });
      } catch {
        /* noop */
      }
    },
    clientTools: {
      // A Cady chama isso quando o usuário pede pra salvar/memorizar algo —
      // vai pra aba Revisão. (Precisa do client tool 'save_to_review' declarado
      // no agente do ElevenLabs.)
      save_to_review: async ({ term, example, category } = {}) => {
        if (!term) return "I didn't catch what to save.";
        // A cara brava sai de um evento REAL, não de adivinhar pelo texto: a
        // Cady só chama esta ferramenta com category 'correction' quando de
        // fato corrigiu alguma coisa. Se o agente não mandar a categoria, a
        // cara simplesmente não muda — errar pra menos aqui é melhor que ela
        // ficar brava no meio de um elogio.
        // A categoria que a Cady manda é o evento REAL — nada de adivinhar pelo
        // texto. 'correction' = ela corrigiu algo; 'phrase'/'word' = ela achou
        // bom o bastante pra guardar, e isso é aprovação, não bronca.
        if (category === 'correction') reagir('corrigindo');
        else if (category === 'phrase' || category === 'word') reagir('elogiando');

        /* RESPONDE NA HORA, GRAVA POR FORA.

           Enquanto isto era `await fetch(...)`, a conversa INTEIRA esperava a
           nossa API responder: o agente do ElevenLabs fica parado até o client
           tool devolver alguma coisa. E a Cady chama esta ferramenta sozinha a
           cada correção — ou seja, quase todo turno. Uma requisição lenta (banco
           ocupado, rede oscilando, função fria) travava a fala dela no meio da
           conversa, e o sintoma era "ela parou de responder do nada".

           Nada aqui justifica segurar a conversa: guardar um card na Revisão é
           trabalho de fundo, e o valor devolvido é só uma frase que ela pode
           mencionar. Então a gravação vai solta, com teto de tempo pra não ficar
           pendurada, e a resposta sai imediatamente.

           O custo assumido: se a gravação falhar, ela já terá dito que salvou.
           Preferível a travar a aula — e a falha aparece na aba Revisão (o card
           não está lá), não no meio da frase. */
        fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term, example, category }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => { /* best-effort: a conversa não depende disto */ });

        return 'Saved to your Revisão tab!';
      },
    },
  });

  /* O QUE O SDK DEVOLVE É UM RETRATO, NÃO UM ESPELHO.

     `useConversation` devolve um objeto NOVO a cada render, e `isSpeaking` /
     `isMuted` são VALORES dentro dele — não getters. Toda closure que sobrevive
     ao render (um requestAnimationFrame, um setTimeout, um setInterval) continua
     lendo o retrato do render em que nasceu.

     Isso já estava custando caro em silêncio: o loop da boca nasce quando a
     sessão abre, e nesse instante `isSpeaking` é false. Ele nunca via outro
     valor. Resultado: `getOutputVolume()` — que é estável e funciona — NUNCA era
     chamado, a amplitude ficava cravada em zero e a boca da Cady não se mexia a
     conversa inteira. O código parecia certo e a Cady parecia uma foto.

     O mesmo retrato congelado desarmava a rede de segurança do microfone, que é
     um problema mais sério: ver `isSpeaking` preso é justamente o caso que ela
     existe pra resolver.

     `conversation.getOutputVolume` e `setMuted` são `useCallback` presos a um
     ref dentro do SDK — esses são estáveis de verdade. Só os valores precisam
     deste ref. */
  const vivoRef = useRef({});
  vivoRef.current.falando = conversation.isSpeaking;
  vivoRef.current.mudo = conversation.isMuted;
  vivoRef.current.setMuted = conversation.setMuted;
  vivoRef.current.volume = conversation.getOutputVolume;
  vivoRef.current.status = conversation.status;

  const start = useCallback(async (opcoes) => {
    // `automatico` = não foi a pessoa que tocou; foi a retomada depois de o
    // agente ter derrubado a conversa. Muda a 1ª fala e a mensagem de erro.
    const automatico = !!(opcoes && opcoes.automatico);
    setErrorMsg('');
    setNotConfigured(false);
    pediuParar.current = false;
    setStarting(true);
    try {
      /* `status` vira 'error' em QUALQUER onError do SDK — inclusive nos que não
         derrubam nada (uma ferramenta desconhecida, um setMuted que falhou). A
         tela volta pro repouso, mas a sessão de baixo pode continuar viva; abrir
         outra por cima seria uma segunda conversa rodando e sendo cobrada em
         paralelo. Fecha a órfã antes. */
      if (vivoRef.current.status && vivoRef.current.status !== 'disconnected') {
        try { await conversation.endSession(); } catch { /* já estava fechada */ }
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // A voz escolhida na galeria. Vai como CHAVE — o id do agente é resolvido
      // no servidor (lib/agentesVoz.js).
      const voz = agent?.id || 'cadi';
      const res = await fetch(`/api/convai/signed-url?agente=${encodeURIComponent(voz)}`);
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) throw new Error('signed_url');
      const { signedUrl } = await res.json();
      const name = firstName || 'there';
      // Modo revisão falada: vira uma "lição guiada" cujo drill são os cards
      // salvos — reusa a mesma mecânica de lição (nenhuma seção nova no prompt).
      const reviewList = isReview
        ? reviewItems.map((it, i) => `${i + 1}) ${it.term}${it.example ? ` — e.g. "${it.example}"` : ''}`).join('  ')
        : '';
      const lessonUnit = unit
        || (isReview
          ? {
              title: 'your review',
              focus: 'the words and phrases you saved',
              context: 'your saved review list',
              drill: `Go through these saved items one at a time. For each, get ${name} to produce a correct, natural sentence using it: if they nail it, say so and move on; if not, correct briefly and have them try once more. Keep it snappy. Items: ${reviewList}`,
            }
          : null);
      // 1ª fala da Cady: lição abre no exercício; revisão abre no 1º card;
      // senão, saudação normal. Vai pra {{opening_line}} na First message.
      /* O que a Cady já sabe desta conversa. Na retomada automática ele é
         montado do transcript que está na tela AGORA — é o que faz ela emendar a
         frase em vez de se apresentar de novo. */
      const contexto = automatico
        ? contextoDeRetomada(messagesRef.current, resumeTopic || '')
        : (resumeContext || '');
      const openingLine = unit
        ? `Alright ${name}! Let's nail ${unit.focus}. Here's an example — ${unit.example} Now your turn: give me one like that!`
        : isCard
          ? `Quick practice on "${cardDrill.term}".${cardDrill.example ? ` Here's how it's used — ${cardDrill.example}` : ''} Now you try: say a sentence with it. We'll do it just twice, then you've got it — I'll wrap up with a "you're learning how to use ${cardDrill.term}!"`
          : isReview
            ? `Alright ${name}, let's run through the ${reviewItems.length} ${reviewItems.length === 1 ? 'thing' : 'things'} you saved. First up — ${reviewItems[0].term}. Give me a fresh sentence using it!`
            : automatico
              ? `Sorry ${name}, I cut out for a second — I'm back! Go ahead, I'm listening.`
              : contexto
                ? `Hey ${name}! Let's pick up right where we left off.`
                : (openingGreeting || `Hi ${name}! I'm Cady, your English teacher! How's it going?`);
      /* O BLOCO DE LIÇÃO PRECISA DIZER, EM VOZ ALTA, QUE NÃO HÁ LIÇÃO.

         As quatro variáveis `unit_*` só eram enviadas QUANDO havia lição. Em
         conversa aberta elas caíam no default cadastrado no painel do ElevenLabs
         — vazio —, e o system prompt do agente renderizava literalmente
         "Lesson:  — focus:  — context:" logo abaixo da seção `# Guided lesson`,
         que manda rodar um drill e termina em "then END THE CALL".

         Pra um modelo pequeno (o agente roda Haiku) isso não é obviamente "não
         há lição": é uma lição sem nome. E a própria seção admite a tendência
         que cria, ao implorar "do NOT stop after just two or three" — que é
         exatamente onde a conversa estava morrendo. Nenhuma variável ausente é
         neutra quando o prompt já tem a instrução de desligar.

         Mandar 'NONE' explícito, e dizer no drill que isto é conversa aberta e
         que ela não deve encerrar, tira a ambiguidade na origem. */
      const semLicao = isCard
        ? `NONE. This is a quick single-card practice, not a lesson: follow the opening line, keep it to two tries, then wrap up warmly and end the call.`
        : 'NONE. There is no lesson set. This is an OPEN CONVERSATION: ignore the entire Guided lesson section, do not run a drill, and never end the call yourself — keep talking and asking follow-up questions until the student stops it.';
      await conversation.startSession({
        signedUrl,
        dynamicVariables: {
          opening_line: openingLine,
          // Explícitas mesmo quando vazias: variável ausente vira o default do
          // painel, que é conteúdo que este código não controla nem enxerga.
          user_name: firstName || 'there',
          agent_name: agent?.name || 'Cady',
          prior_context: contexto,
          user_memory: (!unit && !isReview && memoryText) ? memoryText : '',
          unit_title: lessonUnit ? lessonUnit.title : 'NONE',
          unit_focus: lessonUnit ? lessonUnit.focus : 'NONE',
          unit_context: lessonUnit ? lessonUnit.context : 'NONE',
          unit_drill: lessonUnit ? lessonUnit.drill : semLicao,
        },
      });
    } catch (err) {
      if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError') {
        setErrorMsg('Preciso do microfone pra gente conversar. Libera o acesso e tenta de novo.');
      } else {
        setErrorMsg(automatico
          ? 'A conversa caiu e não consegui reconectar. Toque pra continuar — o que vocês já falaram está salvo.'
          : 'Não consegui iniciar a conversa. Tenta de novo.');
      }
      if (automatico) {
        // A retomada falhou: desfaz a marca, senão o próximo onConnect acharia
        // que é continuação e não montaria a transcrição.
        retomandoRef.current = false;
        setRetomando(false);
      }
    } finally {
      setStarting(false);
    }
  }, [conversation, firstName, agent, resumeContext, resumeTopic, unit, isReview, reviewItems, memoryText, isCard, cardDrill, openingGreeting]);

  // A retomada automática mora dentro do onDisconnect, que é registrado antes de
  // `start` existir. O ref é o que fura essa ordem.
  startRef.current = start;

  const stop = useCallback(async () => {
    pediuParar.current = true;
    try {
      await conversation.endSession();
    } catch {
      /* já encerrada */
    }
  }, [conversation]);

  // Verdadeiro só quando fomos NÓS que mudamos, porque ela começou a falar.
  // É o que separa "silenciei sozinho e devo desfazer" de "a pessoa escolheu
  // ficar muda e eu não tenho nada que desfazer isso".
  const mudoPorNos = useRef(false);
  // A pessoa tocou no botão durante esta fala dela — decisão automática pausada
  // até ela calar.
  const assumido = useRef(false);

  const toggleMute = useCallback(() => {
    try {
      const d = aoTocarMute({ mudo: conversation.isMuted, falando: conversation.isSpeaking });
      conversation.setMuted(d.mudar);
      mudoPorNos.current = d.nosso;
      assumido.current = d.assumido;
    } catch {
      /* noop */
    }
  }, [conversation]);

  // A janela de transcrição acompanha a conversa sozinha (rola pro fim a cada
  // fala nova), sem empurrar a página inteira.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, showTranscript]);

  /* Grava o que já foi dito, com uma folga de 1,5s pra não mandar uma requisição
     por fala. `transcript.length` é o gatilho porque é o que muda a cada turno —
     e porque um turno a mais é exatamente o que ainda não está no banco. */
  useEffect(() => {
    if (!transcript.length) return undefined;
    const t = setTimeout(() => { persistir(); }, 1500);
    return () => clearTimeout(t);
  }, [transcript.length, persistir]);

  /* Sair da TELA sem fechar a aba — trocar pra "Escrever", abrir uma conversa
     salva, navegar pra outra aba do app — desmonta este componente. E o SDK
     remove os listeners ANTES de encerrar a sessão, então o `onDisconnect` do
     app não chega a rodar: sem isto, a conversa some sem erro nenhum. */
  const persistirRef = useRef(persistir);
  persistirRef.current = persistir;
  useEffect(() => () => { persistirRef.current({ fim: true, aoSair: true }); }, []);

  /* Sair da página no meio da conversa era o jeito mais comum de perder tudo: o
     `onDisconnect` não roda a tempo e um fetch normal é cancelado junto com a
     aba. `pagehide` cobre fechar/navegar; `visibilitychange` cobre o celular que
     bloqueia a tela, que no iOS costuma ser o último evento que chega. */
  useEffect(() => {
    const aoSair = () => { persistir({ fim: true, aoSair: true }); };
    const aoEsconder = () => { if (document.visibilityState === 'hidden') aoSair(); };
    window.addEventListener('pagehide', aoSair);
    document.addEventListener('visibilitychange', aoEsconder);
    return () => {
      window.removeEventListener('pagehide', aoSair);
      document.removeEventListener('visibilitychange', aoEsconder);
    };
  }, [persistir]);

  const status = conversation.status; // 'disconnected' | 'connecting' | 'connected' | 'error'
  const active = status === 'connected';
  /* 'error' NÃO é fim de sessão. O SDK do React inventa esse status em qualquer
     onError (ConversationStatus.js) e não encosta na conexão — o socket segue
     aberto. Pra tudo que cuida do MICROFONE o que importa é existir uma sessão,
     não ela estar saudável: era com `active` que a rede de segurança desligava
     justamente no momento em que ela era mais necessária. */
  const sessaoViva = status !== 'disconnected';
  const connecting = starting || status === 'connecting';
  const muted = active && conversation.isMuted;
  const speaking = active && conversation.isSpeaking;

  // Enquanto ela fala, o microfone fecha sozinho; quando ela para, abre de novo.
  // A pessoa pode desmutar no meio pra interromper — o botão marca
  // `mudoPorNos = false` e a gente não desfaz mais nada nesta rodada.
  //
  // O que se perde: o barge-in natural do ElevenLabs, que deixa cortar a fala
  // dela só falando por cima. Aqui isso passa a exigir um toque.
  useEffect(() => {
    try {
      const d = decidirMute({
        ativo: active,
        falando: speaking,
        mudo: !!conversation.isMuted,
        nosso: mudoPorNos.current,
        assumido: assumido.current,
      });
      mudoPorNos.current = d.nosso;
      assumido.current = d.assumido;
      if (d.mudar !== null) conversation.setMuted(d.mudar);
    } catch {
      /* setMuted pode não existir antes da sessão abrir */
    }
    // conversation muda de identidade a cada render do hook; o que importa aqui
    // são as bordas de `speaking` e `active`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking, active]);

  /* REDE DE SEGURANÇA DO MICROFONE.

     Todo o fechar-e-abrir automático depende de uma coisa só: `isSpeaking` ir
     pra false quando a Cady termina. Se esse sinal não chega — o WebSocket
     engasgou, o áudio acabou sem o evento, a aba ficou em segundo plano no meio
     da fala —, o microfone que NÓS fechamos nunca reabre. E o sintoma disso não
     parece um bug de microfone: parece que ela parou de responder. A pessoa
     fala, fala de novo, e não acontece nada, porque não está sendo ouvida.

     Era o pior tipo de falha que este produto podia ter, porque o produto É a
     fala, e porque ela é silenciosa — nada na tela dizia que o microfone estava
     fechado por nossa conta.

     Então: se o mudo é nosso e ela não está falando há mais de 1,2s, abre. Não
     substitui a lógica de cima (que continua sendo quem decide no caso normal),
     é só o que garante que o estado "fechado" nunca é permanente. Mexe apenas
     no que nós fechamos — quem se mutou sozinho continua mudo. */
  useEffect(() => {
    if (!sessaoViva) return undefined;
    let mudoDesde = 0;
    const t = setInterval(() => {
      const v = vivoRef.current;
      // Só mexe no que NÓS fechamos. Quem se mutou sozinho continua mudo.
      if (!mudoPorNos.current || !v.mudo) { mudoDesde = 0; return; }
      if (!mudoDesde) mudoDesde = Date.now();
      const preso = Date.now() - mudoDesde > 8000;
      if (v.falando && !preso) return;
      try { v.setMuted(false); } catch { /* a sessão pode ter fechado no meio */ }
      mudoPorNos.current = false;
      assumido.current = false;
      mudoDesde = 0;
      /* Reabrir com ela AINDA "falando" quer dizer que o sinal travou ligado.
         É o caso invisível: o microfone ficaria fechado pra sempre e o sintoma
         seria "ela parou de responder" — quando na verdade é a pessoa que não
         está sendo ouvida. Se isto aparecer no registro, o problema é o sinal do
         SDK, não o agente. */
      if (v.falando) {
        try {
          window.cadenceTrack?.('microfone_destravado', {
            turnos: messagesRef.current.length, agente: agent?.id || null,
          });
        } catch { /* noop */ }
      }
    }, 700);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoViva]);

  /* TRAVOU OU CAIU? Os dois chegam iguais na tela — ela para de falar —, e é essa
     ambiguidade que impedia de saber onde procurar. Um socket que cai dispara
     `onDisconnect` e agora conta o motivo; um agente que emudece com o socket
     VIVO não dispara nada, e some sem deixar rastro. Este relógio é o único jeito
     de enxergar o segundo caso: um minuto inteiro sem nenhuma fala, de nenhum dos
     dois lados, com a sessão aberta. Só relata — não mexe na conversa. */
  useEffect(() => {
    if (!active) return undefined;
    let avisado = false;
    const t = setInterval(() => {
      if (avisado || !ultimaFalaEm.current) return;
      const parada = Date.now() - ultimaFalaEm.current;
      if (parada < 60000) return;
      avisado = true;
      try {
        window.cadenceTrack?.('voz_sem_resposta', {
          segundosParado: Math.round(parada / 1000),
          turnos: messagesRef.current.length,
          mudo: !!conversation.isMuted,
          falando: !!conversation.isSpeaking,
          agente: agent?.id || null,
          contexto: usoDeContexto.current,
        });
      } catch {
        /* noop */
      }
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // A boca segue a amplitude real da voz dela. Se o SDK não expuser o volume
  // (versão mais antiga), cai numa oscilação enquanto `isSpeaking` — a boca
  // ainda mexe, só não fica sincronizada com o som.
  useEffect(() => {
    if (!active) { nivelRef.current = 0; return undefined; }
    let raf = 0;
    const parado = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let suave = 0;
    const passo = () => {
      let alvo = 0;
      // Do ref, não da closure: ver vivoRef. Ler daqui era o que matava a boca.
      const ler = vivoRef.current.volume;
      if (vivoRef.current.falando) {
        if (typeof ler === 'function') {
          const v = ler() || 0;
          // getOutputVolume devolve valores baixos; a raiz abre a faixa útil
          // (senão a boca quase não sai do lugar em fala normal).
          alvo = Math.min(1, Math.sqrt(v) * 1.9);
        } else {
          alvo = parado ? 0.5 : 0.45 + 0.45 * Math.abs(Math.sin(performance.now() / 130));
        }
      }
      // suavização: sem ela a boca treme a cada quadro
      suave += (alvo - suave) * (alvo > suave ? 0.45 : 0.18);
      // Ref, não setState: ver o comentário lá em cima, no nivelRef.
      nivelRef.current = suave;
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* O rosto, e a ORDEM aqui é o conserto de um bug que estava em produção.

     `mudo` vinha antes de `falando`. Só que o microfone fecha SOZINHO enquanto
     ela fala (lib/conversaMute.js — é o preço que se paga por não ter mais o
     barge-in do ElevenLabs), então `muted` é verdadeiro justamente durante toda
     a fala dela. Resultado: a cara de mudo — olho de traço, boca reta — cobria
     cada frase que ela dizia, e as caras de fala nunca chegavam à tela.

     Agora falar ganha de mudo, que é o que a informação pede: enquanto ela
     fala, o rosto é sobre ELA; quando ela cala, o rosto relata o microfone. E o
     estado do microfone não se perde — o botão fica verde, com aria-pressed, e
     a linha de status diz. Cara não é o único lugar onde isso está escrito.

     FALANDO, O PADRÃO É RIR. Era `talking` — olho de bolinha, boca esticando:
     a cara de quem emite som, não de quem está gostando da conversa. A reação
     ganha enquanto dura, e a boca acompanha a voz em qualquer uma delas (o
     `falando` vai por fora, ver CadyLive). */
  let cara = 'idle';
  if (connecting) cara = 'curious';
  else if (active && reacao === 'corrigindo') cara = speaking ? 'corrigindo_falando' : 'corrigindo';
  else if (active && reacao === 'elogiando') cara = 'elogiando';
  else if (active && speaking) cara = 'rindo';
  else if (active && muted) cara = 'mudo';
  else if (active) cara = 'ouvindo';

  let statusLabel = unit ? 'Toque pra começar a lição' : isCard ? 'Toque pra praticar falando' : isReview ? 'Toque pra revisar falando' : resumeTopic ? 'Toque pra continuar de onde parou' : agent ? `Toque pra falar com ${agent.name}` : 'Toque pra começar a falar';
  // A retomada ganha do "Conectando…": ela explica um reconectar que a pessoa
  // não pediu, e sem isso a tela some do ar por um segundo sem dizer por quê.
  if (retomando) statusLabel = 'Só um segundo — voltando pra conversa…';
  else if (connecting) statusLabel = 'Conectando…';
  // Mesma inversão da cara, e pelo mesmo motivo: com o mute automático, esta
  // linha dizia "Microfone mudo — desmute para voltar a falar" durante toda a
  // fala dela. Ou seja, mandava a pessoa desmutar exatamente no momento em que
  // o mudo era nosso e ia se desfazer sozinho.
  else if (speaking) statusLabel = `${agent?.name || 'Coach'} falando…`;
  else if (muted) statusLabel = 'Microfone mudo — desmute para voltar a falar';
  else if (active) statusLabel = 'Pode falar — estou ouvindo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 18, paddingTop: 8 }}>
      {agent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: agent.accent, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>
            {agent.name.charAt(0)}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink)' }}>
            <strong>{agent.name}</strong> <span style={{ color: 'var(--ink-soft)' }}>· {agent.role}</span>
          </span>
        </div>
      )}

      {resumeTopic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-2" /></svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Continuando: {resumeTopic}</span>
        </div>
      )}

      {isReview && !resumeTopic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--green-dark, var(--green))', background: 'var(--green-soft)', padding: '6px 12px', borderRadius: 999, maxWidth: '90%' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v6h6M3.5 12a9 9 0 1 0 2-5.7L3 9" /></svg>
          <span>Revisando {reviewItems.length} {reviewItems.length === 1 ? 'card salvo' : 'cards salvos'}</span>
        </div>
      )}

      {/* A Cady é o botão. O orbe verde que ficava aqui era um disco genérico
          com um ícone de microfone: não tinha rosto, não reagia à fala e não
          dizia de quem era a voz. */}
      <button
        onClick={active ? stop : start}
        disabled={connecting}
        aria-label={active ? 'Encerrar conversa' : 'Começar conversa'}
        style={{
          border: 'none', background: 'none', padding: 0, position: 'relative',
          cursor: connecting ? 'default' : 'pointer', lineHeight: 0,
          filter: active ? 'none' : 'saturate(0.55) brightness(0.82)',
          transition: 'filter 260ms ease, transform 120ms ease',
          transform: connecting ? 'scale(0.97)' : 'scale(1)',
        }}
      >
        <CadyLive estado={cara} nivelRef={nivelRef} falando={speaking} size={196} />
        {/* Selo de ação: o rosto sozinho não diz que dá pra tocar. */}
        <span
          style={{
            position: 'absolute', right: 10, bottom: 10, width: 42, height: 42, borderRadius: '50%',
            display: 'grid', placeItems: 'center', background: active ? '#2E9E5B' : '#1E6B41',
            color: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.38)',
          }}
        >
          {active ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="6" width="12" height="12" rx="2.5" />
            </svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </span>
      </button>

      <style jsx>{`
        /* Orbe com movimento orgânico enquanto a Cady fala */
        .cadyOrbSpeaking { animation: cadyOrbSpeak 1.1s ease-in-out infinite; }
        @keyframes cadyOrbSpeak {
          0%   { transform: scale(1);    box-shadow: 0 0 0 6px rgba(46,158,91,0.20), 0 10px 30px rgba(0,0,0,0.22); }
          50%  { transform: scale(1.06); box-shadow: 0 0 0 18px rgba(46,158,91,0.08), 0 10px 30px rgba(0,0,0,0.22); }
          100% { transform: scale(1);    box-shadow: 0 0 0 6px rgba(46,158,91,0.20), 0 10px 30px rgba(0,0,0,0.22); }
        }
        @media (prefers-reduced-motion: reduce) { .cadyOrbSpeaking { animation: none; } }
      `}</style>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', minHeight: 22, textAlign: 'center' }}>{statusLabel}</p>

      {active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? 'Ativar microfone' : 'Mutar microfone'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              border: muted ? '1.5px solid var(--green)' : '1.5px solid var(--line)',
              background: muted ? 'var(--green-soft)' : 'transparent',
              color: 'var(--ink)',
            }}
          >
            {muted ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 10.5V6a3 3 0 0 0-5.9-.7" />
                <path d="M5 11a7 7 0 0 0 10.3 6.2M19 11a7 7 0 0 0-.5-2.6M12 18v3" />
                <path d="M3 3l18 18" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            )}
            {muted ? 'Microfone mudo' : 'Mutar microfone'}
          </button>
          <button
            onClick={stop}
            style={{ background: 'transparent', border: '1.5px solid var(--line)', borderRadius: 999, padding: '9px 16px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}
          >
            Encerrar
          </button>
        </div>
      )}

      {errorMsg && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--red, #c0392b)', textAlign: 'center', maxWidth: 320 }}>{errorMsg}</p>
      )}

      {notConfigured && (
        <div className="v2-card" style={{ maxWidth: 380, textAlign: 'left' }}>
          <strong style={{ fontSize: 14 }}>Agente de voz ainda não configurado</strong>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            Falta plugar as chaves do ElevenLabs (<code>ELEVENLABS_API_KEY</code> e <code>ELEVENLABS_AGENT_ID</code>).
            Siga o passo a passo em <code>docs/elevenlabs-agent-setup.md</code>.
          </p>
        </div>
      )}

      {transcript.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 4 }}>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 12.5, cursor: 'pointer', padding: 6 }}
          >
            {showTranscript ? 'Esconder transcrição' : 'Ver transcrição ao vivo'}
          </button>
          {showTranscript && (
            <div
              ref={scrollRef}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8,
                maxHeight: 'min(44vh, 340px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                padding: '10px 12px', borderRadius: 14, border: '1px solid var(--line)',
              }}
            >
              {transcript.map((line, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: line.role === 'you' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', fontSize: 13.5, lineHeight: 1.45,
                    background: line.role === 'you' ? 'var(--green-soft)' : 'var(--v2-card-bg)',
                    color: line.role === 'you' ? 'var(--ink)' : 'var(--v2-card-fg)',
                    border: line.role === 'you' ? 'none' : '1px solid var(--line)',
                    borderRadius: 12, padding: '8px 12px',
                  }}
                >
                  {line.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConversationClient({ firstName, onSaved, onEncerrada, agent, resumeContext, resumeTopic, resumeMessages, resumeId, unit, reviewItems, memoryText, cardDrill, openingGreeting }) {
  return (
    <ConversationProvider>
      <ConversationInner firstName={firstName} onSaved={onSaved} onEncerrada={onEncerrada} agent={agent} resumeContext={resumeContext} resumeTopic={resumeTopic} resumeMessages={resumeMessages} resumeId={resumeId} unit={unit} reviewItems={reviewItems} memoryText={memoryText} cardDrill={cardDrill} openingGreeting={openingGreeting} />
    </ConversationProvider>
  );
}
