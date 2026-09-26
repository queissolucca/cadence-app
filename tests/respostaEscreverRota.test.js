import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* A ROTA DO ESCREVER DE PONTA A PONTA, COM A API DE MENTIRA.

   tests/respostaEscrever.test.js testa as peças. Este roda o POST de verdade
   de app/api/chat/route.js — o loop de tool use inteiro — trocando só o que
   sai da máquina: o SDK da Anthropic, o Supabase, a memória e o log de uso.
   É o único jeito de provar que o LOOP usa as peças do jeito certo: que o
   texto da rodada do tool_use chega na bolha, que não sai uma terceira chamada
   à toa, e que a segunda tentativa manda uma requisição que a API aceita.

   O SDK falso aplica a regra da API que derrubava a versão anterior: bloco
   tool_use/tool_result na conversa sem `tools` definido é 400. */

const api = vi.hoisted(() => ({ respostas: [], chamadas: [], inserts: [] }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {
      this.messages = {
        create: async (params) => {
          api.chamadas.push(structuredClone(params));
          const temBloco = params.messages.some((m) => Array.isArray(m.content)
            && m.content.some((b) => b.type === 'tool_use' || b.type === 'tool_result'));
          if (temBloco && !params.tools) {
            throw Object.assign(new Error('400 Requests which include `tool_use` or `tool_result` blocks must define tools.'), { status: 400 });
          }
          const r = api.respostas.shift();
          if (!r) throw new Error('o teste não previu esta chamada à API');
          if (r instanceof Error) throw r;
          return { usage: { input_tokens: 10, output_tokens: 5 }, ...r };
        },
      };
    }
  },
}));

/* Supabase falso: toda consulta é encadeável e "await"-ável, como a de
   verdade. O perfil devolve um nome; as correções antigas, nenhuma; o insert
   do save_to_review é guardado pra conferir. */
vi.mock('../lib/supabase/server.js', () => {
  const consulta = (resultado) => {
    const q = {
      select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => resultado,
      insert: async (linha) => { api.inserts.push(linha); return { error: null }; },
      then: (ok, erro) => Promise.resolve(resultado).then(ok, erro),
    };
    return q;
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (tabela) => consulta(tabela === 'profiles' ? { data: { full_name: 'Ana Souza' } } : { data: [] }),
  };
  return { createClient: () => supabase };
});

vi.mock('../lib/memory.js', () => ({ loadMemoryBlock: async () => '' }));
vi.mock('../lib/usage.js', () => ({ logUsage: async () => {} }));

const { POST } = await import('../app/api/chat/route.js');
const { FRASE_DE_RESERVA } = await import('../lib/respostaEscrever.js');

const texto = (t) => ({ type: 'text', text: t });
const salva = (id, input = { term: 'I went', example: 'I went to the beach.', category: 'correction' }) => ({
  type: 'tool_use', id, name: 'save_to_review', input,
});
const CORRECAO = "Ai. É 'I went', não 'I go'.\nAgora: who did you go to the beach with?";

async function enviar(mensagem = 'I go to the beach yesterday') {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: mensagem }] }),
  });
  const res = await POST(req);
  return { status: res.status, corpo: await res.json() };
}

const temBlocoDeFerramenta = (params) => params.messages.some((m) => Array.isArray(m.content)
  && m.content.some((b) => b.type === 'tool_use' || b.type === 'tool_result'));

let chaveAntes;
beforeEach(() => {
  api.respostas.length = 0;
  api.chamadas.length = 0;
  api.inserts.length = 0;
  chaveAntes = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'chave-de-teste';
});
afterEach(() => {
  if (chaveAntes === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = chaveAntes;
  vi.restoreAllMocks();
});

describe('o Escrever quando a Cady corrige e salva na Revisão', () => {
  it('O BUG: [texto + tool_use] e depois rodada vazia — a bolha é o texto, sem frase de reserva', async () => {
    api.respostas.push(
      { stop_reason: 'tool_use', content: [texto(CORRECAO), salva('t1')] },
      { stop_reason: 'end_turn', content: [] },
    );
    const { status, corpo } = await enviar();
    expect(status).toBe(200);
    expect(corpo.reply).toBe(CORRECAO);
    expect(corpo.reply).not.toBe(FRASE_DE_RESERVA);
    // Salvou na Revisão, e contou pra tela mostrar o "item guardado".
    expect(corpo.saved).toEqual([{ term: 'I went', category: 'correction' }]);
    expect(api.inserts).toHaveLength(1);
    // Duas idas à API, não três: com texto na mão, não existe segunda tentativa.
    expect(api.chamadas).toHaveLength(2);
  });

  it('se o modelo repete a pergunta depois do tool_result, ela não sai duas vezes', async () => {
    api.respostas.push(
      { stop_reason: 'tool_use', content: [texto(CORRECAO), salva('t1')] },
      { stop_reason: 'end_turn', content: [texto('Agora: who did you go to the beach with?')] },
    );
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
  });

  it('a ferramenta veio sozinha e o texto só no fim: entrega o do fim', async () => {
    api.respostas.push(
      { stop_reason: 'tool_use', content: [salva('t1')] },
      { stop_reason: 'end_turn', content: [texto(CORRECAO)] },
    );
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
    expect(api.chamadas).toHaveLength(2);
  });

  it('max_tokens com tool_use pela metade: entrega o texto e NÃO salva o termo cortado', async () => {
    api.respostas.push({
      stop_reason: 'max_tokens',
      content: [texto(CORRECAO), salva('t1', { term: 'I we' })],
    });
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
    expect(api.inserts, 'input truncado não vira card na Revisão').toHaveLength(0);
    expect(api.chamadas).toHaveLength(1);
  });

  it('quatro rodadas seguidas de ferramenta: vale o que ela escreveu em qualquer uma', async () => {
    api.respostas.push(
      { stop_reason: 'tool_use', content: [texto(CORRECAO), salva('t1')] },
      { stop_reason: 'tool_use', content: [salva('t2', { term: 'went', category: 'word' })] },
      { stop_reason: 'tool_use', content: [salva('t3', { term: 'beach', category: 'word' })] },
      { stop_reason: 'tool_use', content: [salva('t4', { term: 'yesterday', category: 'word' })] },
    );
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
    expect(api.chamadas, 'sem quinta chamada: já tinha texto').toHaveLength(4);
  });
});

describe('o Escrever quando nenhuma rodada traz texto', () => {
  it('a segunda tentativa leva tools + tool_choice none, na conversa limpa', async () => {
    api.respostas.push(
      { stop_reason: 'tool_use', content: [salva('t1')] },
      { stop_reason: 'end_turn', content: [] },
      { stop_reason: 'end_turn', content: [texto(CORRECAO)] },
    );
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
    expect(api.chamadas).toHaveLength(3);
    const segunda = api.chamadas[2];
    expect(segunda.tool_choice).toEqual({ type: 'none' });
    expect(segunda.tools?.map((t) => t.name)).toEqual(['save_to_review']);
    /* Conversa limpa: sem a rodada em que a Cady "já encerrou" o turno — que é
       o estado em que o modelo tende a voltar vazio de novo. */
    expect(temBlocoDeFerramenta(segunda)).toBe(false);
    expect(segunda.messages.at(-1)).toEqual({ role: 'user', content: 'I go to the beach yesterday' });
    // O que já foi salvo continua salvo.
    expect(corpo.saved).toHaveLength(1);
  });

  it('rodada única vazia: pede de novo e entrega a Cady', async () => {
    api.respostas.push(
      { stop_reason: 'end_turn', content: [] },
      { stop_reason: 'end_turn', content: [texto(CORRECAO)] },
    );
    const { corpo } = await enviar();
    expect(corpo.reply).toBe(CORRECAO);
  });

  it('se a segunda tentativa falha, loga o motivo e entrega a frase de reserva (sem derrubar a rota)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.respostas.push(
      { stop_reason: 'end_turn', content: [] },
      Object.assign(new Error('529 overloaded'), { status: 529 }),
    );
    const { status, corpo } = await enviar();
    expect(status).toBe(200);
    expect(corpo.reply).toBe(FRASE_DE_RESERVA);
    expect(log).toHaveBeenCalled();
  });
});
