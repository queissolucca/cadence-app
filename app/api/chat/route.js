import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../../lib/cady/promptEscrever';
import { carregarTom } from '../../../lib/cady/tomServidor';
import { createClient } from '../../../lib/supabase/server';
import { loadMemoryBlock } from '../../../lib/memory';
import { logUsage } from '../../../lib/usage';
import { textoDe, juntarTextos, comTexto } from '../../../lib/respostaEscrever';

export const dynamic = 'force-dynamic';

const client = new Anthropic();
const MODEL = 'claude-haiku-4-5'; // texto: Haiku por custo/latência
const CATEGORIES = ['correction', 'phrase', 'word'];

// A Cady salva na Revisão via tool (server-side): mais limpo que a client tool
// do voice — grava direto no Supabase e o loop continua.
const SAVE_TOOL = {
  name: 'save_to_review',
  description:
    "Save a word, phrase, or correction to the user's spaced-repetition review list (the Revisão tab). Call it when the user asks to save/memorize something, and also automatically right after you make a real correction worth practicing.",
  input_schema: {
    type: 'object',
    properties: {
      term: { type: 'string', description: 'The exact word, phrase, or corrected/native form to save, in English.' },
      example: { type: 'string', description: 'A short, natural example sentence in English using the term.' },
      category: { type: 'string', enum: CATEGORIES, description: 'One of: correction, phrase, word. Use "correction" when fixing a mistake.' },
    },
    required: ['term'],
  },
};

/* AS CORREÇÕES ANTIGAS — o {{past_corrections}} do prompt do agente.

   A seção de callbacks é a melhor coisa do prompt: apontar pro erro que a
   pessoa cometia semana passada e agora não comete mais. Mas ela só funciona
   com dado real — sem ele, seria uma instrução mandando lembrar de um vazio.

   O dado já existe e não precisou de tabela nova: cada correção que a Cady faz
   já é gravada em `review_saved` com category 'correction' (é o que alimenta a
   aba Revisão). Aqui é só leitura, e roda em paralelo com a memória, então não
   soma latência à resposta.

   A data vira linguagem ("ontem", "semana passada") porque o prompt pede que
   ela DIGA quando era, e timestamp cru viraria timestamp na bolha. */
async function loadPastCorrections(supabase, userId) {
  const r = await supabase
    .from('review_saved')
    .select('term, created_at')
    .eq('user_id', userId)
    .eq('category', 'correction')
    .order('created_at', { ascending: false })
    .limit(12);
  if (r.error || !r.data?.length) return '';
  const agora = Date.now();
  const quando = (iso) => {
    const dias = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 86400000));
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias < 7) return `${dias} dias atrás`;
    if (dias < 14) return 'semana passada';
    return `${Math.round(dias / 7)} semanas atrás`;
  };
  return r.data.map((c) => `- "${c.term}" (${quando(c.created_at)})`).join('\n');
}

/* O PROMPT DA CONVERSA ABERTA MORA EM lib/cady/promptEscrever.js.

   Ele saiu daqui quando passou a ter três níveis de tom (iniciante, suave,
   ácida): cada nível precisa ser montado e lido num teste, e esta rota só
   roda num teste simulando Next, o Supabase do servidor e o SDK da Anthropic
   (tests/estiloCady.test.js faz isso, pra fiação). O texto em si fica num
   arquivo puro e é testado direto. O nível de cada turno sai de
   lib/cady/tom.js — ver o POST. */
// Modo LIÇÃO (trilha por escrita): drill focado no alvo da unidade, não papo.
function lessonPrompt(name, unit) {
  const who = name || 'there';
  return `You are Cady, a warm, sharp North American (US/Canada) English teacher. You're running a focused WRITING drill with ${who}, a Brazilian learner (Portuguese is their first language) — this is a lesson, not open chat. Everything is over text.

# The drill
- Target: ${unit.focus}. Context: ${unit.context}. What to drill: ${unit.drill}
- The opening message already gave an example and asked ${who} to produce one. Jump straight to making them WRITE the target, again and again, in different little contexts.
- Keep replies SHORT (1-2 sentences): quick reaction, correct if needed, then the next little prompt to produce the target again.
- Give them a real workout: aim for about 6 to 8 good productions of the target before wrapping up — do NOT stop after two or three.

# Corrections
- Fix mistakes on the target (and anything that blocks meaning) fast and inline. Whenever you make a REAL correction, call the save_to_review tool (category "correction") with the corrected form and a short example — quietly, WITHOUT announcing it. Save each once; skip trivial slips.

# Wrapping up
- After ~6-8 good tries, give a warm one-line closing: celebrate the work, and tell them they can drill it again, try it in Conversa aberta, or head to the next lesson. Then you're done.

# Rules
- Reply ONLY in English. Sound like a real North American (contractions, natural slang), not a textbook. Encouraging, never condescending. Light formatting only — no long blocks.`;
}

function parseUnit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const title = s(raw.title, 120);
  const focus = s(raw.focus, 200);
  if (!focus && !title) return null;
  return { title, focus, context: s(raw.context, 200), drill: s(raw.drill, 600) };
}

function parseCard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  const term = s(raw.term, 200);
  if (!term) return null;
  return { term, example: s(raw.example, 400) };
}

// Drill RELÂMPAGO de 1 card da Revisão (escrita): direto ao ponto, exemplo da
// vida do usuário, pede pra escrever, 2 rodadas, e encerra parabenizando.
function cardDrillPrompt(name, card, memoryBlock = '') {
  const who = name || 'there';
  return `You are Cady, a warm English teacher doing a SUPER quick, focused writing practice with ${who} (a Brazilian learning English) on ONE thing: "${card.term}"${card.example ? ` (example: "${card.example}")` : ''}.
${memoryBlock ? `
# What you know about ${who} (use it to pick a real, personal context)
${memoryBlock}
` : ''}
# How this works — keep it FAST and focused
- Go straight to "${card.term}". No small talk, no intro.
- Give ONE natural example of it used in a real everyday context — ideally something from ${who}'s own life.
- Then ask ${who} to WRITE a sentence using "${card.term}" in a similar real-life context.
- React in one line and correct briefly if needed, then give ONE more quick prompt to use it again.
- Do EXACTLY 2 rounds (2 sentences from ${who}) — no more.
- Right after the 2nd one, END with a short warm closing, naturally like: "Awesome — you're learning how to use '${card.term}'! 🎉" Do NOT continue after that.

# Rules
- English only. Very short replies (1-2 sentences). Encouraging and natural, never a lecture.`;
}

// Normaliza o histórico vindo do cliente pro formato da Anthropic.
function toAnthropicMessages(raw) {
  const arr = Array.isArray(raw) ? raw.slice(-20) : [];
  const out = [];
  for (const m of arr) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.slice(0, 2000) : '';
    if (content) out.push({ role, content });
  }
  // A Anthropic exige o 1º turno como 'user' — descarta saudações iniciais da
  // Cady (assistant) que possam vir na frente.
  while (out.length && out[0].role === 'assistant') out.shift();
  return out;
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const messages = toAnthropicMessages(body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || '';

  const unit = parseUnit(body.unit);
  const card = parseCard(body.cardDrill);
  // Injeta memória (fatos pessoais) na conversa aberta e no drill de card (pra
  // Cady usar um contexto da vida do usuário). Em lição não injeta.
  //
  // As leituras vão JUNTAS. Em fila, a das correções somaria a ida ao
  // banco na latência de cada mensagem enviada — e esta é a tela em que a
  // pessoa fica esperando a resposta aparecer.
  /* O TOM DA CADY SÓ EXISTE NA CONVERSA ABERTA. Lição e drill de card têm
     prompt próprio, curto e já gentil, e o `tom` do body é ignorado neles.

     carregarTom lê o estilo escolhido no Perfil e conta as outras conversas
     da pessoa, e vai no MESMO Promise.all: são duas idas leves ao banco que,
     em fila, somariam na espera de cada mensagem. Ele nunca lança — se a
     coluna do estilo ainda não existe ou a contagem falha, o nível cai em
     'suave', que é o lado seguro (ver lib/cady/tom.js). */
  const aberta = !unit && !card;
  const [memoryBlock, pastCorrections, tom] = await Promise.all([
    unit ? '' : loadMemoryBlock(supabase, user.id),
    aberta ? loadPastCorrections(supabase, user.id) : '',
    aberta ? carregarTom(supabase, user.id, messages, body.tom) : null,
  ]);
  const system = unit
    ? lessonPrompt(firstName, unit)
    : card
      ? cardDrillPrompt(firstName, card, memoryBlock)
      : systemPrompt(firstName, memoryBlock, pastCorrections, tom);

  const convo = [...messages];
  const saved = [];
  /* O texto de CADA rodada, na ordem — inclusive o que veio junto com um
     tool_use. A bolha é a soma delas (juntarTextos), não só a última: ler só a
     última era o que fazia a resposta da Cady sumir justo nos turnos em que ela
     corrigia e salvava na Revisão. Ver lib/respostaEscrever.js. */
  const falas = [];
  let usageIn = 0;
  let usageOut = 0;
  const logChat = () => logUsage(supabase, user.id, { kind: unit ? 'chat_lesson' : card ? 'chat_card' : 'chat', model: MODEL, inputTokens: usageIn, outputTokens: usageOut });

  /* A SEGUNDA TENTATIVA, PRA QUANDO NENHUMA RODADA ESCREVEU NADA.

     Vai com `messages` — a conversa como a pessoa mandou —, e não com `convo`.
     Só se chega nela quando nenhuma rodada trouxe texto, então as rodadas de
     ferramenta que estão em `convo` não têm fala nenhuma que a resposta precise.
     O que elas têm é o contrário: um histórico em que a Cady já encerrou o turno
     depois do tool_result. A doc da Anthropic diz que, nesse estado, o modelo
     tende a continuar encerrado — reenviar aquilo voltaria vazio de novo. Na
     conversa limpa, a última mensagem é da pessoa e ainda não tem resposta.

     As ferramentas vão DEFINIDAS e o comTexto acrescenta tool_choice 'none': a
     requisição é válida em qualquer caso e o modelo não tem como chamar
     ferramenta, só escrever. O que já foi salvo na Revisão continua salvo. */
  const pedidoSoTexto = {
    model: MODEL, max_tokens: 500, temperature: 0.7, system, tools: [SAVE_TOOL], messages,
  };

  try {
    // Loop de tool use: a Cady pode salvar 1+ itens antes de responder em texto.
    for (let step = 0; step < 4; step += 1) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 700,   // 400 era apertado: o turno estourava dentro da chamada da ferramenta e voltava sem texto
        temperature: 0.7,
        system,
        tools: [SAVE_TOOL],
        messages: convo,
      });
      usageIn += resp.usage?.input_tokens || 0;
      usageOut += resp.usage?.output_tokens || 0;
      falas.push(textoDe(resp));

      const toolUses = (resp.content || []).filter((b) => b.type === 'tool_use');
      if (resp.stop_reason === 'tool_use' && toolUses.length) {
        convo.push({ role: 'assistant', content: resp.content });
        const results = [];
        for (const tu of toolUses) {
          const { term, example, category } = tu.input || {};
          let ok = false;
          if (term && typeof term === 'string') {
            const cat = CATEGORIES.includes(category) ? category : 'correction';
            const { error } = await supabase.from('review_saved').insert({
              user_id: user.id,
              term: term.slice(0, 200),
              example: typeof example === 'string' ? example.slice(0, 400) : null,
              category: cat,
            });
            ok = !error;
            if (ok) saved.push({ term: term.slice(0, 200), category: cat });
          }
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: ok ? 'Saved to review.' : 'Could not save.' });
        }
        convo.push({ role: 'user', content: results });
        continue;
      }

      /* Fim do turno: end_turn, e também max_tokens. No max_tokens pode vir um
         tool_use pela metade, com o input truncado — esse NÃO roda (salvaria
         um termo cortado na Revisão). Mas o texto que veio antes dele já está
         em `falas`: a Cady escreve a resposta e só depois chama a ferramenta,
         então é o tool_use que fica cortado, não a fala. */
      break;
    }

    /* Uma saída só, pros dois jeitos de sair do loop: o fim normal (break) e as
       quatro rodadas seguidas de ferramenta. Nos dois, vale o que a Cady já
       escreveu em qualquer rodada; a segunda tentativa só entra se não houver
       texto nenhum — e, sem poder chamar ferramenta, ela não fica presa de novo. */
    logChat();
    return NextResponse.json({ reply: await comTexto(juntarTextos(falas), pedidoSoTexto, client), saved });
  } catch (err) {
    console.error('chat error:', err);
    /* SE A CADY JÁ TINHA FALADO, A FALA SAI MESMO COM A API CAINDO NO MEIO.

       O caso: a rodada 0 veio [texto, tool_use] — a correção escrita E o card
       já salvo na Revisão — e a rodada 1, a que só existe pra devolver o
       tool_result, estourou (529 depois dos retries do SDK, timeout, rede).
       Devolver 500 aqui jogava fora uma resposta que estava pronta: a pessoa
       via "Não consegui responder agora", o card já estava na Revisão, e ao
       reenviar a mensagem o mesmo termo tendia a ser salvo de novo, em
       duplicata. Com texto na mão, ele é a resposta; `saved` vai junto pra tela
       mostrar o que foi guardado.

       Sem texto nenhum, continua 500: não existe fala pra entregar, e com a API
       falhando uma segunda tentativa só somaria espera antes do mesmo erro. */
    const jaTem = juntarTextos(falas);
    if (jaTem) {
      logChat();
      return NextResponse.json({ reply: jaTem, saved });
    }
    return NextResponse.json({ error: 'chat_failed' }, { status: 500 });
  }
}
