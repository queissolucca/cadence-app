import { describe, it, expect, vi, afterEach } from 'vitest';
import { textoDe, juntarTextos, comTexto, fechaOTurno, FRASE_DE_RESERVA } from '../lib/respostaEscrever.js';

/* A RESPOSTA DO ESCREVER, TESTADA RODANDO.

   O bug que isto segura: a Cady escrevia a resposta e chamava o save_to_review
   no MESMO turno ([text, tool_use]); a rodada seguinte, depois do tool_result,
   voltava vazia; a rota só lia a última e jogava fora a fala. Depois pedia de
   novo com uma requisição que a API recusa (400), engolia o erro e mostrava a
   frase de emergência. Aqui as respostas da API são montadas à mão, no formato
   que ela devolve de verdade. */

const texto = (t) => ({ type: 'text', text: t });
const ferramenta = (id, input = { term: 'I went', category: 'correction' }) => ({
  type: 'tool_use', id, name: 'save_to_review', input,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('textoDe', () => {
  it('pega o texto que vem JUNTO com o tool_use', () => {
    /* Era este o texto que se perdia: ele existe, só vem na mesma resposta que
       a chamada da ferramenta. */
    const resp = { stop_reason: 'tool_use', content: [texto("É 'I went', não 'I go'. Where did you go?"), ferramenta('t1')] };
    expect(textoDe(resp)).toBe("É 'I went', não 'I go'. Where did you go?");
  });

  it('resposta vazia vira string vazia, sem quebrar', () => {
    expect(textoDe({ stop_reason: 'end_turn', content: [] })).toBe('');
    expect(textoDe({})).toBe('');
    expect(textoDe(undefined)).toBe('');
  });
});

describe('juntarTextos — a bolha é a soma das rodadas', () => {
  const RESPOSTA = "Ai. É 'I went', não 'I go'.\nAgora: where did you go last weekend?";

  it('[text + tool_use] seguido de rodada vazia: entrega o texto da primeira', () => {
    /* O caso do bug, e o mais comum de todos. Antes a bolha saía da segunda
       rodada — vazia —, e a Cady de verdade ia pro lixo. */
    expect(juntarTextos([RESPOSTA, ''])).toBe(RESPOSTA);
  });

  it('texto repetido depois do tool_result não aparece duas vezes', () => {
    // Repetiu tudo:
    expect(juntarTextos([RESPOSTA, RESPOSTA])).toBe(RESPOSTA);
    // Repetiu só a pergunta final, que é o que o modelo mais faz:
    expect(juntarTextos([RESPOSTA, 'Agora: where did you go last weekend?'])).toBe(RESPOSTA);
    // Caixa e espaço diferentes não fazem virar outra frase:
    expect(juntarTextos([RESPOSTA, '  agora:   where did you go LAST weekend?  '])).toBe(RESPOSTA);
  });

  it('repetição de uma frase que estava no meio de uma linha também é cortada', () => {
    /* A Cady escreve várias frases numa linha só. Comparar linha com linha
       deixaria passar a pergunta repetida; por isso a comparação é por frase. */
    const umaLinha = "Ai. É 'I went'. Where did you go?";
    expect(juntarTextos([umaLinha, 'Where did you go?'])).toBe(umaLinha);
  });

  /* Os quatro casos abaixo são do revisor, e todos passavam errado na primeira
     versão, que deduplicava por LINHA e com "está contido em" (substring de
     caracteres). Ela só olhava linha inteira contra o texto já dito: pegava a
     pergunta repetida sozinha numa linha, mas não a pergunta colada numa frase
     nova, nem a resposta reescrita com outra quebra de linha — e, por ser
     substring sem limite de palavra, sumia com frase nova que nunca foi dita. */
  const CORRIGIU = "Almost! It's 'I went'.\nWhere did you go?";

  it('a pergunta repetida colada numa frase nova: fica só a frase nova', () => {
    // Antes: "…\nWhere did you go?\nSaved! Where did you go?" — a pergunta duas vezes.
    expect(juntarTextos([CORRIGIU, 'Saved! Where did you go?']))
      .toBe("Almost! It's 'I went'.\nWhere did you go?\nSaved!");
  });

  it('a mesma resposta com outra quebra de linha não sai duplicada', () => {
    // Antes: a resposta INTEIRA duas vezes, porque as linhas não batiam.
    expect(juntarTextos([CORRIGIU, "Almost! It's 'I went'. Where did you go?"])).toBe(CORRIGIU);
  });

  it('aspa tipográfica numa rodada e reta na outra é a mesma frase', () => {
    // Antes: a correção saía duas vezes, uma com ’ e outra com '.
    const curva = 'Almost! It’s ‘I went’.\nWhere did you go?';
    expect(juntarTextos([curva, CORRIGIU])).toBe(curva);
    expect(juntarTextos([CORRIGIU, curva])).toBe(CORRIGIU);
  });

  it('frase nova e curta não some por estar "dentro" de uma palavra já dita', () => {
    // Antes: "So?" sumia, porque "so?" é substring de "also?".
    expect(juntarTextos(['Nice! Did you bring your sister also?', 'So?']))
      .toBe('Nice! Did you bring your sister also?\nSo?');
  });

  it('ponto de abreviação não vira frase — senão o "Mr." de outra frase sumiria', () => {
    /* Se "Mr." fosse um pedaço sozinho, a rodada 2 perderia o título no meio da
       frase dela ("Jones too."). */
    expect(juntarTextos(['Mr. Smith is nice.', 'Mr. Jones too.'])).toBe('Mr. Smith is nice.\nMr. Jones too.');
    expect(juntarTextos(['Use it, e.g. at work.', 'E.g. at home too.'])).toBe('Use it, e.g. at work.\nE.g. at home too.');
  });

  it('aspa que fecha depois do ponto ainda termina a frase', () => {
    expect(juntarTextos(["Say 'I went.' Then tell me more.", 'Then tell me more.']))
      .toBe("Say 'I went.' Then tell me more.");
  });

  it('dentro da MESMA rodada nada é cortado: o texto do modelo passa como veio', () => {
    /* O filtro existe pra replay entre rodadas. Mexer no que o modelo escreveu
       numa rodada só seria editar a Cady — e uma linha sem repetição sai byte
       por byte igual, inclusive o espaçamento. */
    expect(juntarTextos(['Where did you go? Where did you go?', ''])).toBe('Where did you go? Where did you go?');
    expect(juntarTextos(['Ai.  Errado.', ''])).toBe('Ai.  Errado.');
  });

  it('frase repetida entre parágrafos não deixa buraco de três linhas', () => {
    expect(juntarTextos(['A.', 'B.\n\nA.\n\nC.'])).toBe('A.\nB.\n\nC.');
  });

  it('repetiu tudo e acrescentou: entra só o que é novo', () => {
    expect(juntarTextos(['Ai. Errado.', 'Ai. Errado.\nTry again: I went to the beach.']))
      .toBe('Ai. Errado.\nTry again: I went to the beach.');
  });

  it('texto novo depois do tool_result entra, depois do anterior', () => {
    // Nada foi jogado fora: a correção da rodada 1 e a pergunta da rodada 2.
    expect(juntarTextos(["É 'I went', não 'I go'.", 'Where did you go?']))
      .toBe("É 'I went', não 'I go'.\nWhere did you go?");
  });

  it('só rodadas vazias: nada — e é aí que entra a segunda tentativa', () => {
    expect(juntarTextos(['', ''])).toBe('');
    expect(juntarTextos(['   ', '\n\n'])).toBe('');
    expect(juntarTextos([])).toBe('');
    expect(juntarTextos(undefined)).toBe('');
  });

  it('texto só no fim (a ferramenta veio sozinha antes): entrega o do fim', () => {
    expect(juntarTextos(['', RESPOSTA])).toBe(RESPOSTA);
  });

  it('não mexe na quebra de parágrafo que o modelo escreveu', () => {
    // A tela é pre-wrap: a linha em branco é o respiro entre a bronca e a pergunta.
    expect(juntarTextos(['Ai.\n\nWhere did you go?', ''])).toBe('Ai.\n\nWhere did you go?');
  });
});

/* O LOOP JUNTO COM O MODO INICIANTE (lote de 2026-09-26).

   As duas branches foram feitas separadas: a do "me perdi" juntou as rodadas
   com deduplicação por frase, e a do tom criou o modo iniciante, que fecha todo
   turno com uma pergunta e as opções embaixo, "a) ..." em linhas próprias. Só
   juntas aparece o problema: "a) Yes." e "b) No." são frases curtas que se
   repetem de verdade debaixo de perguntas diferentes, e a deduplicação as
   tirava da pergunta nova — que ficava pelada, o que o prompt do iniciante
   proíbe com todas as letras. */
describe('juntarTextos — as opções do modo iniciante', () => {
  const INICIANTE = "Quase! É 'I went', porque foi ontem.\nWhere did you go yesterday?\na) I went to work.\nb) I went to the gym.\nc) I went to my mom's house.";

  it('a resposta inteira repetida depois do tool_result sai uma vez, com as opções por último', () => {
    expect(juntarTextos([INICIANTE, ''])).toBe(INICIANTE);
    expect(juntarTextos([INICIANTE, INICIANTE])).toBe(INICIANTE);
    // Repetiu só a pergunta e as opções: nada entra de novo.
    expect(juntarTextos([INICIANTE, "Where did you go yesterday?\na) I went to work.\nb) I went to the gym.\nc) I went to my mom's house."]))
      .toBe(INICIANTE);
  });

  it('pergunta NOVA com as mesmas opções curtas: as opções ficam com ela', () => {
    /* Antes: "Do you like it?\na) Yes.\nb) No.\nDid you go again?" — a segunda
       pergunta sem opção nenhuma. */
    expect(juntarTextos(['Do you like it?\na) Yes.\nb) No.', 'Did you go again?\na) Yes.\nb) No.']))
      .toBe('Do you like it?\na) Yes.\nb) No.\nDid you go again?\na) Yes.\nb) No.');
  });

  it('pergunta repetida colada numa frase nova: as opções repetidas saem com ela', () => {
    expect(juntarTextos(['Coffee or tea?\na) Coffee.\nb) Tea.', 'Boa! Coffee or tea?\na) Coffee.\nb) Tea.']))
      .toBe('Coffee or tea?\na) Coffee.\nb) Tea.\nBoa!');
  });

  it('opção nunca sai cortada pela metade', () => {
    /* "Really." já foi dito, mas a opção vai inteira debaixo da pergunta nova.
       Antes saía "a) It was fine." — a opção que ele ia copiar, mudada. */
    expect(juntarTextos(['Nice. Really.', 'How was it?\na) It was fine. Really.\nb) Not great.']))
      .toBe('Nice. Really.\nHow was it?\na) It was fine. Really.\nb) Not great.');
  });

  it('as frases prontas com lacuna continuam deduplicadas como frase', () => {
    const lacunas = 'I usually ___ on weekends.\nMy favorite food is ___.';
    expect(juntarTextos([`Boa! Você tentou.\n${lacunas}`, lacunas])).toBe(`Boa! Você tentou.\n${lacunas}`);
  });
});

/* Um client falso com a MESMA regra da API que derrubava a versão anterior:
   requisição com bloco tool_use/tool_result sem `tools` definido é 400. */
function clientFalso(resposta) {
  const chamadas = [];
  const client = {
    messages: {
      create: vi.fn(async (params) => {
        chamadas.push(structuredClone(params));
        const temBlocoDeFerramenta = (params.messages || []).some((m) => Array.isArray(m.content)
          && m.content.some((b) => b.type === 'tool_use' || b.type === 'tool_result'));
        if (temBlocoDeFerramenta && !params.tools) {
          const e = new Error('400 Requests which include `tool_use` or `tool_result` blocks must define tools.');
          e.status = 400;
          throw e;
        }
        if (resposta instanceof Error) throw resposta;
        return resposta;
      }),
    },
  };
  return { client, chamadas };
}

const PEDIDO = {
  model: 'claude-haiku-4-5',
  max_tokens: 500,
  temperature: 0.7,
  system: 'prompt',
  tools: [{ name: 'save_to_review', input_schema: { type: 'object' } }],
  messages: [{ role: 'user', content: 'I go to the beach yesterday' }],
};

describe('comTexto — a segunda tentativa', () => {
  it('se já tem texto, não chama a API de novo', async () => {
    const { client } = clientFalso({ content: [texto('não devia ser chamado')] });
    expect(await comTexto('Oi! Where did you go?', PEDIDO, client)).toBe('Oi! Where did you go?');
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('pede de novo com as ferramentas DEFINIDAS e tool_choice none', async () => {
    const { client, chamadas } = clientFalso({ stop_reason: 'end_turn', content: [texto('Tá. Where did you go?')] });
    expect(await comTexto('', PEDIDO, client)).toBe('Tá. Where did you go?');
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].tool_choice).toEqual({ type: 'none' });
    expect(chamadas[0].tools, 'sem tools, conversa com bloco de ferramenta é 400').toEqual(PEDIDO.tools);
    // O resto do pedido passa intacto.
    expect(chamadas[0].system).toBe('prompt');
    expect(chamadas[0].messages).toEqual(PEDIDO.messages);
  });

  it('é válida mesmo se a conversa tiver blocos de ferramenta', async () => {
    /* Hoje a rota manda a conversa limpa, mas a requisição não pode depender
       disso pra ser aceita: foi exatamente essa dependência que quebrou. */
    const comFerramenta = {
      ...PEDIDO,
      messages: [
        ...PEDIDO.messages,
        { role: 'assistant', content: [ferramenta('t1')] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'Saved to review.' }] },
      ],
    };
    const { client } = clientFalso({ stop_reason: 'end_turn', content: [texto('Tá. Where did you go?')] });
    expect(await comTexto('', comFerramenta, client)).toBe('Tá. Where did you go?');
  });

  it('a versão antiga (sem tools) é exatamente o que o client falso recusa', async () => {
    /* Controle: prova que o client falso reproduz o 400 — sem isto, o teste
       acima passaria até com um client que aceita qualquer coisa. */
    const { client } = clientFalso({ content: [texto('x')] });
    const semTools = { ...PEDIDO, tools: undefined, messages: [
      ...PEDIDO.messages,
      { role: 'assistant', content: [ferramenta('t1')] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
    ] };
    await expect(client.messages.create(semTools)).rejects.toMatchObject({ status: 400 });
  });

  it('se a segunda tentativa falhar, o erro vai pro log e a pessoa recebe a frase de reserva', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erro = Object.assign(new Error('529 overloaded'), { status: 529 });
    const { client } = clientFalso(erro);
    expect(await comTexto('', PEDIDO, client)).toBe(FRASE_DE_RESERVA);
    expect(log, 'o catch não pode mais ser mudo').toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][1]).toMatchObject({ status: 529, mensagem: '529 overloaded' });
  });

  it('conta o uso da segunda tentativa pra rota pôr no log', async () => {
    const { client } = clientFalso({ stop_reason: 'end_turn', content: [texto('Tá. Where did you go?')], usage: { input_tokens: 3000, output_tokens: 120 } });
    const usos = [];
    expect(await comTexto('', PEDIDO, client, (u) => usos.push(u))).toBe('Tá. Where did you go?');
    expect(usos).toEqual([{ input_tokens: 3000, output_tokens: 120 }]);
    // Sem callback, continua funcionando como antes.
    expect(await comTexto('', PEDIDO, clientFalso({ content: [texto('Oi?')] }).client)).toBe('Oi?');
  });

  it('se a segunda tentativa voltar vazia de novo, também fica no log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = clientFalso({ stop_reason: 'end_turn', content: [] });
    expect(await comTexto('', PEDIDO, client)).toBe(FRASE_DE_RESERVA);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][1]).toMatchObject({ stop_reason: 'end_turn' });
  });
});

/* ESTA FALA JÁ FECHA O TURNO? — é o que a rota usa pra não pedir a rodada do
   tool_result quando a Cady já respondeu inteira (ver o loop em
   app/api/chat/route.js e tests/respostaEscreverRota.test.js). */
describe('fechaOTurno', () => {
  it('fecha com pergunta, opção ou lacuna na última linha', () => {
    for (const t of [
      "Ai. É 'I went', não 'I go'.\nAgora: who did you go to the beach with?",
      'Where did you go? In English.',
      'Where did you go?\na) I went to the beach.\nb) I went to the mall.',
      'Where did you go?\nI went to the ___.',
      'Boa!\nWhere did you go?\n\n',
    ]) expect(fechaOTurno(t), t).toBe(true);
  });

  it('preâmbulo e fala sem fecho não fecham', () => {
    for (const t of ['Claro, vou salvar essa!', "Ai. É 'I went', não 'I go'.", 'Where did you go?\nClaro, vou salvar.', '', '   ', undefined, null]) {
      expect(fechaOTurno(t), String(t)).toBe(false);
    }
  });
});

describe('a frase de reserva', () => {
  it('não diz "me perdi" nem acusa a pessoa de não ter escrito em inglês', () => {
    /* Ela pode muito bem ter escrito em inglês — no bug, era o caso comum: a
       Cady tinha corrigido o inglês dela e salvado na Revisão. */
    expect(FRASE_DE_RESERVA).not.toMatch(/me perdi/i);
    expect(FRASE_DE_RESERVA).not.toMatch(/this time/i);
    expect(FRASE_DE_RESERVA).not.toMatch(/in English/i);
  });

  it('pede pra reenviar e fecha com uma pergunta em inglês, como todo turno da Cady', () => {
    expect(FRASE_DE_RESERVA).toMatch(/manda de novo/i);
    const ultima = FRASE_DE_RESERVA.split(/(?<=[.?!])\s+/).pop();
    expect(ultima.endsWith('?')).toBe(true);
    expect(ultima, 'a pergunta final é em inglês').toMatch(/^[A-Za-z' ]+\?$/);
  });

  it('é curta, e sem markdown nem emoji (a bolha imprime tudo literal)', () => {
    expect(FRASE_DE_RESERVA.length).toBeLessThanOrEqual(120);
    expect(FRASE_DE_RESERVA).not.toMatch(/[*_#`]/);
    expect(FRASE_DE_RESERVA).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(FRASE_DE_RESERVA, 'o pronome é "você", nunca "cê"').not.toMatch(/(^|[^A-Za-zÀ-ÿ])[Cc]ê(?![A-Za-zÀ-ÿ])/);
  });
});
