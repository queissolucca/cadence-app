import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { lerFonte, lerCru, RAIZ } from './fonte.js';
import { supabaseFalso, COLUNA_INEXISTENTE } from './supabaseFalso.js';
import { ESTILOS_CADY } from '../lib/cady/tom.js';

/* O ESTILO DA CADY, DO PERFIL ATÉ O PROMPT — e a regra do dono no caminho.

   A regra: "sem quebrar nada". A coluna nova (`profiles.cady_estilo`) vem numa
   migration que o dono roda à mão, então o código vai ao ar ANTES dela e tem
   que funcionar sem ela. Os testes de rota abaixo rodam as rotas de verdade,
   com um Supabase de mentira que responde `{ error }` pra coluna que não
   existe — que é exatamente o que o Postgres faz. As três coisas que não podem
   quebrar: o nome da pessoa no /api/chat, a troca de tema no Perfil, e o
   select do perfil em todas as telas. */

const estado = vi.hoisted(() => ({ supabase: null, pedidos: [] }));

vi.mock('../lib/supabase/server.js', () => ({ createClient: () => estado.supabase }));
vi.mock('../lib/memory.js', () => ({ loadMemoryBlock: async () => '' }));
vi.mock('../lib/usage.js', () => ({ logUsage: () => {} }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {
      this.messages = {
        create: async (pedido) => {
          estado.pedidos.push(pedido);
          return { content: [{ type: 'text', text: 'Boa! Where did you go?' }], stop_reason: 'end_turn', usage: {} };
        },
      };
    }
  },
}));

const { POST: chat } = await import('../app/api/chat/route.js');
const { POST: preferencias } = await import('../app/api/profile/preferences/route.js');

const pedir = (rota, corpo) => rota(new Request('http://cadence.test/api', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo),
}));

const UUID = '3f2b8c1e-9a4d-4e2b-8f11-2c3d4e5f6a7b';
const INGLES = [
  { role: 'assistant', content: 'Oi Ana! Eu sou a Cady! Tell me what you did today!' },
  { role: 'user', content: 'I went to the beach' },
  { role: 'assistant', content: 'Boa! Who did you go with?' },
  { role: 'user', content: 'I went with my friends' },
];
const TRAVADO = [
  { role: 'user', content: 'não sei' },
  { role: 'assistant', content: 'Sem problema! What did you eat today?' },
  { role: 'user', content: 'como fala almoço?' },
];

function bancoDoChat({ estilo = 'equilibrada', semColuna = false, conversas = 0 } = {}) {
  return supabaseFalso((q) => {
    if (q.tabela === 'profiles' && q.colunas === 'full_name') return { data: { full_name: 'Ana Souza' }, error: null };
    if (q.tabela === 'profiles' && q.colunas === 'cady_estilo') return semColuna ? COLUNA_INEXISTENTE : { data: { cady_estilo: estilo }, error: null };
    if (q.tabela === 'profiles') return COLUNA_INEXISTENTE;   // qualquer select que misturasse colunas
    if (q.tabela === 'conversations') return { data: null, count: conversas, error: null };
    return { data: [], error: null };
  });
}

async function systemDoChat(banco, corpo) {
  estado.supabase = banco.client;
  estado.pedidos = [];
  const res = await pedir(chat, corpo);
  expect(res.status, 'a rota respondeu com erro').toBe(200);
  return estado.pedidos[0].system;
}

describe('o /api/chat monta a Cady do nível certo', () => {
  const chaveAntes = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'teste'; });
  afterEach(() => {
    if (chaveAntes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = chaveAntes;
  });

  it('1ª conversa, Equilibrada: suave, mesmo com acertos', async () => {
    const s = await systemDoChat(bancoDoChat({ conversas: 0 }), { messages: INGLES, tom: { acertos: 9, correcoesSeguidas: 0 } });
    expect(s).toContain('# Warm, not acid\n');
    expect(s).not.toContain('# Acid\n');
  });

  it('Ácida escolhida: ácida já na primeira conversa', async () => {
    const s = await systemDoChat(bancoDoChat({ estilo: 'acida', conversas: 0 }), { messages: INGLES });
    expect(s).toContain('# Acid\n');
  });

  it('travando: modo iniciante, mesmo pra quem escolheu Ácida', async () => {
    const s = await systemDoChat(bancoDoChat({ estilo: 'acida', conversas: 12 }), { messages: TRAVADO });
    expect(s).toContain('# Beginner mode\n');
  });

  it('Equilibrada veterana: a acidez só entra a partir de 3 acertos nesta conversa', async () => {
    const banco = () => bancoDoChat({ conversas: 5 });
    expect(await systemDoChat(banco(), { messages: INGLES, tom: { acertos: 2 } })).toContain('# Warm, not acid\n');
    expect(await systemDoChat(banco(), { messages: INGLES, tom: { acertos: 3 } })).toContain('# Acid\n');
  });

  it('SEM A COLUNA (migration pendente): o nome continua, e o estilo vale Equilibrada', async () => {
    const banco = bancoDoChat({ semColuna: true, conversas: 30 });
    const s = await systemDoChat(banco, { messages: INGLES, tom: { acertos: 1 } });
    expect(s, 'o nome da pessoa não pode sumir junto com a coluna nova').toContain('Ana is typing');
    // O select do nome continua sendo SÓ do nome — a coluna nova não entrou nele.
    const doNome = banco.consultas.find((q) => q.tabela === 'profiles' && q.colunas.includes('full_name'));
    expect(doNome.colunas).toBe('full_name');
    /* Sem a coluna, a pessoa é tratada exatamente como quem tem 'equilibrada'
       gravado — o default que a migration vai dar a todo mundo. */
    for (const acertos of [1, 3]) {
      const semColuna = await systemDoChat(bancoDoChat({ semColuna: true, conversas: 30 }), { messages: INGLES, tom: { acertos } });
      const equilibrada = await systemDoChat(bancoDoChat({ estilo: 'equilibrada', conversas: 30 }), { messages: INGLES, tom: { acertos } });
      expect(semColuna, `${acertos} acertos`).toBe(equilibrada);
    }
  });

  it('SEM A COLUNA E SEM A CONTAGEM: suave, o lado seguro', async () => {
    const tudoFalha = supabaseFalso((q) => (q.tabela === 'profiles' && q.colunas === 'full_name'
      ? { data: { full_name: 'Ana Souza' }, error: null }
      : COLUNA_INEXISTENTE));
    const s = await systemDoChat(tudoFalha, { messages: INGLES, tom: { acertos: 50 } });
    expect(s).toContain('# Warm, not acid\n');
    expect(s).toContain('Ana is typing');
  });

  it('a conversa atual sai da contagem das "3 primeiras"', async () => {
    const banco = bancoDoChat({ conversas: 2 });
    await systemDoChat(banco, { messages: INGLES, tom: { acertos: 5, conversaId: UUID } });
    const contagem = banco.consultas.find((q) => q.tabela === 'conversations');
    expect(contagem.opcoes).toEqual({ count: 'exact', head: true });
    expect(contagem.filtros).toContainEqual(['neq', 'id', UUID]);
  });

  it('lição e drill de card não leem tom nenhum, e ignoram o `tom` do body', async () => {
    for (const extra of [
      { unit: { title: 'Past', focus: 'past simple', context: 'weekend', drill: 'x' } },
      { cardDrill: { term: 'I went', example: 'I went home.' } },
    ]) {
      const banco = bancoDoChat({ estilo: 'acida', conversas: 9 });
      const s = await systemDoChat(banco, { messages: INGLES, tom: { acertos: 50 }, ...extra });
      expect(s, 'lição/card têm prompt próprio').not.toContain('# THE LAST LINE');
      expect(banco.consultas.some((q) => q.tabela === 'conversations'), 'não conta conversas').toBe(false);
      expect(banco.consultas.some((q) => q.colunas === 'cady_estilo'), 'não lê o estilo').toBe(false);
    }
  });

  it('o tom é lido no MESMO Promise.all da memória e das correções', () => {
    const ROTA = lerFonte('app/api/chat/route.js');
    const i = ROTA.indexOf('const [memoryBlock, pastCorrections, tom] = await Promise.all([');
    expect(i, 'as leituras precisam sair juntas').toBeGreaterThan(-1);
    const bloco = ROTA.slice(i, ROTA.indexOf(']);', i));
    expect(bloco).toMatch(/aberta \? carregarTom\(supabase, user\.id, messages, body\.tom\) : null/);
    /* Era `systemPrompt(firstName, memoryBlock, pastCorrections, tom)`, fechado
       no `tom`. No lote de 2026-09-26 entrou um quinto argumento, só com a
       oferta do Falar na tela (ver o describe logo abaixo); o tom continua
       sendo o quarto, e é ele que este teste guarda. */
    expect(ROTA).toMatch(/: systemPrompt\(firstName, memoryBlock, pastCorrections, tom, \{ ofertaNaTela \}\)/);
  });
});

/* A OFERTA DO FALAR NA TELA E A LINHA DO FALAR NO PROMPT (lote de 2026-09-26).

   O TextChatClient manda `ofertaFalar: true` quando vai mostrar a oferta do
   Falar embaixo da resposta; a rota troca a linha em que a Cady vende o Falar
   por uma em que ela só acolhe o pedido. Sem isso, as duas branches juntas
   davam duas propagandas no mesmo turno. */
describe('o /api/chat com a oferta do Falar na tela', () => {
  const chaveAntes = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'teste'; });
  afterEach(() => {
    if (chaveAntes === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = chaveAntes;
  });
  const QUER_FALAR = [...INGLES, { role: 'user', content: 'poxa, mas eu queria falar' }];

  it('com ofertaFalar, a Cady não vende o Falar de novo — em qualquer nível', async () => {
    for (const estilo of ESTILOS_CADY) {
      const s = await systemDoChat(bancoDoChat({ estilo, conversas: 9 }), { messages: QUER_FALAR, ofertaFalar: true });
      expect(s, estilo).toMatch(/right under your message it shows him the Falar offer/);
      expect(s, estilo).not.toMatch(/part of the Plano Pro/);
      expect(s, estilo).toContain('# THE LAST LINE');
    }
  });

  it('sem ofertaFalar (ou com lixo no lugar), a linha do Falar é a de sempre', async () => {
    for (const extra of [{}, { ofertaFalar: 'true' }, { ofertaFalar: 1 }, { ofertaFalar: false }]) {
      const s = await systemDoChat(bancoDoChat({ conversas: 9 }), { messages: QUER_FALAR, ...extra });
      expect(s, JSON.stringify(extra)).toMatch(/part of the Plano Pro/);
      expect(s, JSON.stringify(extra)).not.toMatch(/shows him the Falar offer/);
    }
  });

  it('a segunda tentativa usa o MESMO prompt, com a oferta levada em conta', async () => {
    /* O comTexto reaproveita o `system` já montado. Se ele montasse outro, a
       resposta de reserva poderia voltar a vender o Falar. */
    const ROTA = lerFonte('app/api/chat/route.js');
    const i = ROTA.indexOf('const pedidoSoTexto = {');
    expect(i).toBeGreaterThan(-1);
    expect(ROTA.slice(i, ROTA.indexOf('};', i))).toMatch(/\bsystem,/);
  });
});

function bancoDasPreferencias({ semColuna = false } = {}) {
  return supabaseFalso((q) => (q.update && 'cady_estilo' in q.update && semColuna ? COLUNA_INEXISTENTE : { data: null, error: null }));
}

async function salvar(banco, corpo) {
  estado.supabase = banco.client;
  const res = await pedir(preferencias, corpo);
  return { status: res.status, corpo: await res.json(), updates: banco.consultas.map((q) => q.update).filter(Boolean) };
}

describe('o /api/profile/preferences salva o estilo sem arriscar o resto', () => {
  it('SEM A COLUNA, trocar o tema continua funcionando', async () => {
    const r = await salvar(bancoDasPreferencias({ semColuna: true }), { theme: 'dark' });
    expect(r.status).toBe(200);
    expect(r.updates).toEqual([{ theme: 'dark' }]);
  });

  it('o estilo vai num update só dele', async () => {
    const r = await salvar(bancoDasPreferencias(), { cadyEstilo: 'acida' });
    expect(r.status).toBe(200);
    expect(r.updates).toEqual([{ cady_estilo: 'acida' }]);
  });

  it('mesmo vindo junto com o tema, o tema é salvo antes e à parte', async () => {
    const r = await salvar(bancoDasPreferencias({ semColuna: true }), { theme: 'light', cadyEstilo: 'iniciante' });
    expect(r.updates[0], 'o tema não pode depender da coluna nova').toEqual({ theme: 'light' });
    expect(r.updates[1]).toEqual({ cady_estilo: 'iniciante' });
    // O estilo não salvou, e a resposta diz isso (é o que faz o toast avisar).
    expect(r.status).toBe(500);
  });

  it('estilo fora dos três é recusado sem tocar no banco', async () => {
    const r = await salvar(bancoDasPreferencias(), { cadyEstilo: 'furiosa' });
    expect(r.status).toBe(400);
    expect(r.corpo.error).toBe('invalid_cadyEstilo');
    expect(r.updates).toEqual([]);
  });

  it('corpo sem nada continua sendo "nothing_to_update"', async () => {
    const r = await salvar(bancoDasPreferencias(), {});
    expect(r.status).toBe(400);
    expect(r.corpo.error).toBe('nothing_to_update');
  });
});

describe('a migration da coluna', () => {
  const PASTA = join(RAIZ, 'supabase/migrations');
  const SQL = lerCru('supabase/migrations/0040_cady_estilo.sql');

  it('cria a coluna com default Equilibrada, sem apagar nada', () => {
    expect(SQL).toMatch(/add column if not exists cady_estilo text not null default 'equilibrada'/);
    expect(SQL, 'nada destrutivo').not.toMatch(/drop column|drop table|delete from|truncate/i);
  });

  it('o check tem exatamente os três estilos do código', () => {
    const m = SQL.match(/check \(cady_estilo in \(([^)]+)\)\)/);
    expect(m, 'o check precisa existir').toBeTruthy();
    expect(m[1].split(',').map((v) => v.trim().replace(/'/g, ''))).toEqual(ESTILOS_CADY);
  });

  it('nenhum número de migration repetido nesta pasta', () => {
    /* A 0039 está tomada na branch ajuste/para-creators (0039_creators.sql),
       por isso esta é a 0040. O teste pega a colisão dentro da mesma pasta. */
    const numeros = readdirSync(PASTA).filter((f) => f.endsWith('.sql')).map((f) => f.slice(0, 4));
    expect(new Set(numeros).size).toBe(numeros.length);
  });
});

describe('a linha "Estilo da Cady" no Perfil', () => {
  const AJUSTES = lerFonte('components/v2/AjustesClient.js');
  const PAGINA = lerFonte('app/v2/(app)/ajustes/page.js');

  it('fica no grupo Personalização e só aparece quando a coluna existe', () => {
    const grupo = AJUSTES.slice(AJUSTES.indexOf('<Group title="Personalização">'), AJUSTES.indexOf('</Group>', AJUSTES.indexOf('<Group title="Personalização">')));
    expect(grupo).toContain('label="Estilo da Cady"');
    expect(grupo).toMatch(/\{cadyEstilo && \(/);
  });

  it('a folha oferece os três estilos do código, com uma linha de explicação cada', () => {
    const i = AJUSTES.indexOf('const ESTILOS_DA_CADY = [');
    const lista = AJUSTES.slice(i, AJUSTES.indexOf('];', i));
    expect([...lista.matchAll(/value: '(\w+)'/g)].map((m) => m[1])).toEqual(ESTILOS_CADY);
    for (const rotulo of ['Iniciante', 'Equilibrada', 'Ácida']) expect(lista).toContain(`label: '${rotulo}'`);
    expect((lista.match(/explica: '/g) || []).length).toBe(3);
    // Não promete a voz: o estilo vale só pro Escrever, e a folha diz isso.
    expect(lista).not.toMatch(/Falar|voz|ligação|chamada/i);
    expect(AJUSTES).toContain('Vale para as conversas no Escrever.');
    expect(AJUSTES).toMatch(/<BottomSheet open=\{sheet === 'estilo'\}/);
  });

  it('salva pelo mesmo caminho das outras preferências', () => {
    expect(AJUSTES).toMatch(/await save\(\{ cadyEstilo: value \}\)/);
  });

  it('a página lê o estilo à parte, sem mexer no select do perfil de todas as telas', () => {
    const i = PAGINA.indexOf('await Promise.all([');
    expect(PAGINA.slice(i, PAGINA.indexOf(']);', i))).toContain('lerEstiloCady(supabase, eu?.id)');
    expect(PAGINA).toContain('cadyEstilo={cadyEstilo}');
    /* Posta no perfilV2, uma coluna inexistente derrubaria o primeiro degrau
       em TODA tela do /v2 (uma ida à rede a mais pra todo mundo, e o recorde
       de sequência sumindo) até a migration rodar. */
    expect(lerFonte('lib/sessaoServidor.js')).not.toContain('cady_estilo');
  });
});

describe('o TextChatClient manda os sinais de tom', () => {
  const CHAT = lerFonte('components/v2/TextChatClient.js');

  it('só na conversa aberta, com o id da conversa já salva', () => {
    expect(CHAT).toMatch(/\.\.\.\(!unit && !cardDrill \? \{ tom: \{ \.\.\.sinaisTom\.current, conversaId: convIdRef\.current \} \} : \{\}\)/);
  });

  it('atualiza os sinais com a MESMA heurística do servidor, a partir do `saved`', () => {
    expect(CHAT).toMatch(/import \{ proximosSinaisTom \} from '\.\.\/\.\.\/lib\/cady\/tom'/);
    expect(CHAT).toMatch(/if \(!unit && !cardDrill\) sinaisTom\.current = proximosSinaisTom\(sinaisTom\.current, text, saved\);/);
  });
});

describe('a voz não recebe nada novo do código', () => {
  it('as variáveis do startSession são as mesmas de antes', () => {
    /* O prompt da voz vive só no painel do ElevenLabs. Uma variável que o
       painel não conhece chega num agente que não a espera — e o Falar é a
       conversa PAGA. Se um dia o tom for pra voz, a variável é registrada no
       painel ANTES (docs/elevenlabs-agent-setup.md), e este teste é atualizado
       junto, de propósito. */
    const CONV = lerFonte('components/v2/ConversationClient.js');
    const i = CONV.indexOf('dynamicVariables: {');
    const bloco = CONV.slice(i + 'dynamicVariables: {'.length, CONV.indexOf('\n        },', i));
    const chaves = [...bloco.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);
    expect(chaves.sort()).toEqual(['agent_name', 'opening_line', 'prior_context', 'unit_context', 'unit_drill', 'unit_focus', 'unit_title', 'user_memory', 'user_name']);
  });

  it('o bloco de tom pronto pra colar no painel está documentado', () => {
    const DOC = lerCru('docs/elevenlabs-agent-setup.md');
    const i = DOC.indexOf('## Tom da Cady — bloco pronto pra colar no painel');
    expect(i, 'a seção precisa existir').toBeGreaterThan(-1);
    const secao = DOC.slice(i, DOC.indexOf('\n## ', i + 10));
    expect(secao).toMatch(/```\n# Beginner mistakes are never the joke/);
    expect(secao).toMatch(/# Beginner mode/);
    expect(secao).toMatch(/Never at not knowing/);
    // A ordem que protege a conversa paga: painel primeiro, código depois.
    expect(secao).toMatch(/`cady_tom`/);
    expect(secao).toMatch(/só DEPOIS o app passa a mandar/);
  });
});
