import { describe, it, expect } from 'vitest';
import {
  ESTILOS_CADY, NIVEIS_TOM, normalizarEstilo, sanitizarSinaisTom, pareceIngles, pedeSocorro,
  sinalDeTravar, estaTravando, corrigiu, contaComoAcerto, proximosSinaisTom, resolverTom,
} from '../lib/cady/tom.js';
import { lerEstiloCady, contarOutrasConversas, carregarTom } from '../lib/cady/tomServidor.js';
import { systemPrompt } from '../lib/cady/promptEscrever.js';
import { supabaseFalso, COLUNA_INEXISTENTE } from './supabaseFalso.js';

/* O TOM DA CADY NO ESCREVER.

   Dois pedidos do dono viraram uma regra só. Pedido A: "Nunca ironizar erro de
   iniciante. Acidez só depois de o usuário acertar algumas frases, ou quando
   ele escolher o estilo Ácida — usuários novos desistiram depois de uma
   resposta irônica." Pedido B: um modo iniciante (português, frases prontas,
   perguntas com opções) e suavizar nas 3 primeiras conversas e pra quem está
   travando — seis pessoas reclamaram do tom.

   Tudo aqui RODA o código: lib/cady/tom.js e promptEscrever.js são puros, e
   tomServidor.js recebe o client por parâmetro. */

const eu = (content) => ({ role: 'user', content });
const cady = (content) => ({ role: 'assistant', content });
const UUID = '3f2b8c1e-9a4d-4e2b-8f11-2c3d4e5f6a7b';

describe('o estilo escolhido e os sinais que o cliente manda', () => {
  it('só três estilos existem, e qualquer outra coisa é Equilibrada', () => {
    expect(ESTILOS_CADY).toEqual(['iniciante', 'equilibrada', 'acida']);
    for (const e of ESTILOS_CADY) expect(normalizarEstilo(e)).toBe(e);
    for (const lixo of [undefined, null, '', 'ÁCIDA', 'acid', 42, {}]) {
      expect(normalizarEstilo(lixo), String(lixo)).toBe('equilibrada');
    }
  });

  it('os números viram inteiros entre 0 e 50, e lixo vira 0 (o lado gentil)', () => {
    expect(sanitizarSinaisTom({ acertos: 3, correcoesSeguidas: 2 })).toMatchObject({ acertos: 3, correcoesSeguidas: 2 });
    expect(sanitizarSinaisTom({ acertos: '4', correcoesSeguidas: 2.9 })).toMatchObject({ acertos: 4, correcoesSeguidas: 2 });
    expect(sanitizarSinaisTom({ acertos: -5, correcoesSeguidas: 9999 })).toMatchObject({ acertos: 0, correcoesSeguidas: 50 });
    expect(sanitizarSinaisTom({ acertos: 'muitos', correcoesSeguidas: NaN })).toMatchObject({ acertos: 0, correcoesSeguidas: 0 });
    expect(sanitizarSinaisTom({ acertos: Infinity })).toMatchObject({ acertos: 0 });
    // Booleano e objeto não são número, mesmo que Number(true) dê 1.
    expect(sanitizarSinaisTom({ acertos: true, correcoesSeguidas: [3] })).toMatchObject({ acertos: 0, correcoesSeguidas: 0 });
    for (const bruto of [undefined, null, 'abc', 7]) {
      expect(sanitizarSinaisTom(bruto), String(bruto)).toEqual({ acertos: 0, correcoesSeguidas: 0, conversaId: null });
    }
  });

  it('o id da conversa só passa se tiver cara de uuid', () => {
    expect(sanitizarSinaisTom({ conversaId: UUID }).conversaId).toBe(UUID);
    for (const lixo of ['1', "x' or 1=1", '', 123, null]) {
      expect(sanitizarSinaisTom({ conversaId: lixo }).conversaId, String(lixo)).toBeNull();
    }
  });
});

describe('parece inglês', () => {
  it('reconhece frase curta e certa, e também a errada — errar em inglês ainda é inglês', () => {
    for (const t of ["I'm fine", 'My name is Ana', 'Yesterday I went to the gym', 'I go to school yesterday', 'Work was hard.', 'I like coffee']) {
      expect(pareceIngles(t), t).toBe(true);
    }
  });

  it('o apóstrofo curvo do iPhone não atrapalha', () => {
    expect(pareceIngles('I’m fine')).toBe(true);
    expect(pareceIngles('I don’t like it')).toBe(true);
  });

  it('português não passa, nem misturado com mais português do que inglês', () => {
    for (const t of ['não sei', 'Eu estou bem', 'to cansado hoje', 'Hoje eu fui to the beach', 'kkkkk', 'Fiz almoço e dormi', '', '???']) {
      expect(pareceIngles(t), t).toBe(false);
    }
  });
});

describe('pedido de socorro', () => {
  it('pega os pedidos do desenho, com e sem acento', () => {
    for (const t of ['não sei', 'nao sei', 'Sei lá', 'sei la', 'não entendi', 'Como se diz cachorro?', 'como fala isso', 'idk', 'I don\'t know', 'I don’t know', 'help', '?', '??']) {
      expect(pedeSocorro(t), t).toBe(true);
    }
  });

  it('não confunde frase boa em inglês com socorro', () => {
    /* "I don't know" dentro de uma frase inteira é inglês bom, não travar —
       por isso as frases em inglês só contam em mensagem curta. */
    for (const t of ["I don't know if I like my new job, but the people are nice", "I'm fine", 'How do you say that?', 'My help desk job is boring and long']) {
      expect(pedeSocorro(t), t).toBe(false);
    }
  });
});

describe('travando', () => {
  it('duas das três últimas mensagens com sinal de travar bastam', () => {
    expect(estaTravando([eu('Hi'), cady('Oi! What did you do today?'), eu('não sei'), cady('...'), eu('como se diz trabalhei?')])).toBe(true);
    expect(estaTravando([eu('Eu fui no mercado'), cady('...'), eu('comprei pão')])).toBe(true);
    expect(estaTravando([eu('?'), eu('idk')])).toBe(true);
  });

  it('uma mensagem de uma palavra só, duas vezes, também é travar (o pedido lista isso)', () => {
    expect(estaTravando([eu('Fine.'), cady('...'), eu('Yes.')])).toBe(true);
  });

  it('frase curta e certa em inglês não é travar', () => {
    expect(estaTravando([eu("I'm fine"), cady('...'), eu("I'm good, thanks"), cady('...'), eu('Work was hard')])).toBe(false);
    expect(sinalDeTravar("I'm fine")).toBe(false);
  });

  it('um sinal só, em três, não é travar', () => {
    expect(estaTravando([eu('I went to the beach'), eu('não sei'), eu('I like the ocean')])).toBe(false);
  });

  it('só as TRÊS últimas contam: quem travou no começo e destravou sai do modo iniciante', () => {
    expect(estaTravando([eu('não sei'), eu('sei lá'), eu('I went to work'), eu('It was a long day'), eu('My boss was nice')])).toBe(false);
  });

  it('o português da Cady não conta: só as mensagens do usuário', () => {
    expect(estaTravando([cady('não sei'), eu('I went to work'), cady('sei lá'), eu('It was fine')])).toBe(false);
  });

  it('correções seguidas sozinhas NÃO bastam — é assim que se aprende, não é travar', () => {
    /* O desenho original tratava "2 respostas seguidas com correção" como
       travar. Mas a Cady corrige quase toda mensagem de quem aprende: isso
       sozinho poria quase todo intermediário no modo iniciante. */
    const frasesInteiras = [eu('Yesterday I go to the park with my dog'), eu('He run very fast and I was tired'), eu('After we eat pizza at home')];
    expect(estaTravando(frasesInteiras, 2)).toBe(false);
    expect(estaTravando(frasesInteiras, 7)).toBe(false);
  });

  it('correções seguidas + um recuo = travando', () => {
    expect(estaTravando([eu('Yesterday I go to the park'), eu('He run very fast'), eu('não sei')], 2)).toBe(true);
    expect(estaTravando([eu('Yesterday I go to the park'), eu('He run very fast'), eu('não sei')], 1)).toBe(false);
  });

  it('entrada estranha não derruba nada', () => {
    expect(estaTravando(undefined)).toBe(false);
    expect(estaTravando('oi')).toBe(false);
    expect(estaTravando([null, { role: 'user', content: [{ type: 'tool_result' }] }])).toBe(false);
  });
});

describe('os acertos desta conversa (o que o TextChatClient guarda)', () => {
  const correcao = [{ term: 'I went', category: 'correction' }];

  it('acerto é inglês de pelo menos duas palavras que a Cady não corrigiu', () => {
    expect(proximosSinaisTom({ acertos: 0, correcoesSeguidas: 0 }, "I'm fine", [])).toEqual({ acertos: 1, correcoesSeguidas: 0 });
    expect(proximosSinaisTom({ acertos: 1, correcoesSeguidas: 0 }, 'I go to school yesterday', correcao)).toEqual({ acertos: 1, correcoesSeguidas: 1 });
  });

  it('português, uma palavra e pedido de socorro não contam como acerto', () => {
    for (const t of ['Eu fui na praia', 'Yes.', "I don't know"]) {
      expect(contaComoAcerto(t), t).toBe(false);
      expect(proximosSinaisTom({ acertos: 2, correcoesSeguidas: 0 }, t, []).acertos, t).toBe(2);
    }
  });

  it('só correção conta como correção — salvar uma palavra a pedido não', () => {
    expect(corrigiu([{ term: 'awesome', category: 'word' }])).toBe(false);
    expect(corrigiu(correcao)).toBe(true);
    expect(corrigiu(undefined)).toBe(false);
    expect(proximosSinaisTom({ acertos: 0, correcoesSeguidas: 3 }, 'I love this word', [{ term: 'x', category: 'phrase' }]))
      .toEqual({ acertos: 1, correcoesSeguidas: 0 });
  });

  it('correções seguidas zeram na primeira resposta sem correção', () => {
    let s = { acertos: 0, correcoesSeguidas: 0 };
    s = proximosSinaisTom(s, 'I go to school yesterday', correcao);
    s = proximosSinaisTom(s, 'He run fast', correcao);
    expect(s.correcoesSeguidas).toBe(2);
    s = proximosSinaisTom(s, 'I went to school yesterday', []);
    expect(s).toEqual({ acertos: 1, correcoesSeguidas: 0 });
  });

  it('o teto também vale no cliente', () => {
    expect(proximosSinaisTom({ acertos: 50, correcoesSeguidas: 0 }, "I'm fine", []).acertos).toBe(50);
  });

  it('três acertos numa conversa depois das três primeiras destravam a acidez da Equilibrada', () => {
    let s = { acertos: 0, correcoesSeguidas: 0 };
    for (const t of ['I went to the gym today', 'It was really good', 'I want to go again tomorrow']) {
      expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: 5, acertos: s.acertos })).toBe('suave');
      s = proximosSinaisTom(s, t, []);
    }
    expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: 5, acertos: s.acertos })).toBe('acida');
  });
});

describe('a regra de decisão', () => {
  it('os três níveis são estes, e só estes', () => {
    expect(NIVEIS_TOM).toEqual(['iniciante', 'suave', 'acida']);
  });

  it("'iniciante' escolhido é sempre iniciante", () => {
    expect(resolverTom({ estilo: 'iniciante', conversasAnteriores: 40, acertos: 50 })).toBe('iniciante');
  });

  it('travando vira iniciante em QUALQUER estilo — inclusive Ácida', () => {
    for (const estilo of ESTILOS_CADY) {
      expect(resolverTom({ estilo, travando: true, conversasAnteriores: 40, acertos: 50 }), estilo).toBe('iniciante');
    }
  });

  it("'acida' escolhida é ácida desde a primeira mensagem da primeira conversa", () => {
    expect(resolverTom({ estilo: 'acida', conversasAnteriores: 0, acertos: 0 })).toBe('acida');
  });

  it('Equilibrada: suave na 1ª, 2ª e 3ª conversa, por mais acertos que haja', () => {
    for (const anteriores of [0, 1, 2]) {
      expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: anteriores, acertos: 50 }), `${anteriores} anteriores`).toBe('suave');
    }
  });

  it('Equilibrada depois das três primeiras: ácida só a partir de 3 acertos nesta conversa', () => {
    expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: 3, acertos: 2 })).toBe('suave');
    expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: 3, acertos: 3 })).toBe('acida');
  });

  it('na dúvida, suave: contagem desconhecida, estilo desconhecido, nada informado', () => {
    expect(resolverTom({ estilo: 'equilibrada', conversasAnteriores: null, acertos: 50 })).toBe('suave');
    expect(resolverTom({ estilo: 'sei lá', conversasAnteriores: null, acertos: 50 })).toBe('suave');
    expect(resolverTom()).toBe('suave');
  });
});

describe('as leituras do servidor', () => {
  it('o estilo é lido numa consulta SÓ dele — nunca junto do nome', async () => {
    const { client, consultas } = supabaseFalso(() => ({ data: { cady_estilo: 'acida' }, error: null }));
    expect(await lerEstiloCady(client, 'u1')).toBe('acida');
    expect(consultas).toHaveLength(1);
    expect(consultas[0]).toMatchObject({ tabela: 'profiles', colunas: 'cady_estilo' });
    expect(consultas[0].filtros).toContainEqual(['eq', 'id', 'u1']);
  });

  it('sem a coluna (migration 0040 pendente), o estilo vira null em vez de lançar', async () => {
    const { client } = supabaseFalso(() => COLUNA_INEXISTENTE);
    expect(await lerEstiloCady(client, 'u1')).toBeNull();
    const quebrado = { from() { throw new Error('rede'); } };
    expect(await lerEstiloCady(quebrado, 'u1')).toBeNull();
    expect(await lerEstiloCady(client, null)).toBeNull();
  });

  it('valor estranho gravado no banco vira Equilibrada', async () => {
    const { client } = supabaseFalso(() => ({ data: { cady_estilo: 'furiosa' }, error: null }));
    expect(await lerEstiloCady(client, 'u1')).toBe('equilibrada');
  });

  it('a contagem é head/count e tira a conversa atual pelo id', async () => {
    const { client, consultas } = supabaseFalso(() => ({ data: null, count: 2, error: null }));
    expect(await contarOutrasConversas(client, 'u1', UUID)).toBe(2);
    expect(consultas[0]).toMatchObject({ tabela: 'conversations', colunas: 'id', opcoes: { count: 'exact', head: true } });
    expect(consultas[0].filtros).toEqual([['eq', 'user_id', 'u1'], ['neq', 'id', UUID]]);
  });

  it('sem id (conversa ainda não salva), conta todas', async () => {
    const { client, consultas } = supabaseFalso(() => ({ count: 0, error: null }));
    expect(await contarOutrasConversas(client, 'u1', null)).toBe(0);
    expect(consultas[0].filtros).toEqual([['eq', 'user_id', 'u1']]);
  });

  it('contagem que falha é "não sei" (null), nunca zero nem exceção', async () => {
    const { client } = supabaseFalso(() => ({ count: null, error: { message: 'timeout' } }));
    expect(await contarOutrasConversas(client, 'u1')).toBeNull();
    expect(await contarOutrasConversas({ from() { throw new Error('rede'); } }, 'u1')).toBeNull();
  });

  it('carregarTom: tudo falhando dá suave, o lado seguro', async () => {
    const { client } = supabaseFalso(() => COLUNA_INEXISTENTE);
    expect(await carregarTom(client, 'u1', [eu('I went to the beach')], { acertos: 50 })).toBe('suave');
  });

  it('carregarTom: o caminho inteiro, do estilo e da contagem até o nível', async () => {
    const responder = (estilo, conversas) => (q) => (q.tabela === 'profiles'
      ? { data: { cady_estilo: estilo }, error: null }
      : { count: conversas, error: null });
    const ingles = [eu('I went to the beach'), eu('It was sunny'), eu('I love the ocean')];
    const travado = [eu('não sei'), eu('sei lá'), eu('como fala praia?')];

    expect(await carregarTom(supabaseFalso(responder('acida', 0)).client, 'u1', ingles, {})).toBe('acida');
    expect(await carregarTom(supabaseFalso(responder('acida', 9)).client, 'u1', travado, {})).toBe('iniciante');
    expect(await carregarTom(supabaseFalso(responder('equilibrada', 1)).client, 'u1', ingles, { acertos: 9 })).toBe('suave');
    expect(await carregarTom(supabaseFalso(responder('equilibrada', 5)).client, 'u1', ingles, { acertos: 3 })).toBe('acida');
    expect(await carregarTom(supabaseFalso(responder('equilibrada', 5)).client, 'u1', ingles, { acertos: 'hack' })).toBe('suave');
    expect(await carregarTom(supabaseFalso(responder('iniciante', 5)).client, 'u1', ingles, { acertos: 50 })).toBe('iniciante');
  });

  it('carregarTom: as duas leituras saem JUNTAS, não em fila', async () => {
    /* O estilo só responde depois que a contagem foi PEDIDA. Em fila (esperar
       o estilo pra depois contar), isso nunca aconteceria e a promessa do
       estilo cairia no plano B abaixo, marcando `emFila`. */
    let contagemPedida;
    const pedida = new Promise((r) => { contagemPedida = r; });
    let emFila = false;
    const client = {
      from(tabela) {
        if (tabela === 'conversations') contagemPedida();
        const b = {
          select: () => b, eq: () => b, neq: () => b,
          maybeSingle: () => Promise.race([
            pedida.then(() => ({ data: { cady_estilo: 'equilibrada' }, error: null })),
            new Promise((r) => setTimeout(() => { emFila = true; r({ data: null, error: null }); }, 200)),
          ]),
          then: (ok, erro) => Promise.resolve({ count: 1, error: null }).then(ok, erro),
        };
        return b;
      },
    };
    await carregarTom(client, 'u1', [eu('Hi there friend')], {});
    expect(emFila, 'a contagem só foi pedida depois de o estilo voltar').toBe(false);
  });
});

describe('o prompt de cada nível', () => {
  const NIVEIS = ['iniciante', 'suave', 'acida'];
  const p = (nivel, memoria = '', correcoesAntigas = '') => systemPrompt('Ana', memoria, correcoesAntigas, nivel);

  it('a regra de nunca ironizar erro de iniciante está nos TRÊS', () => {
    for (const n of NIVEIS) {
      expect(p(n), n).toMatch(/# Beginner mistakes are never the joke/);
      expect(p(n), n).toMatch(/A beginner mistake gets the fix and nothing else/);
      expect(p(n), n).toMatch(/Never at not knowing\. Never at an honest attempt\./);
      expect(p(n), n).toMatch(/the FIRST time an error shows up in this conversation/);
    }
  });

  it('cada nível traz o SEU bloco de tom, e só o seu', () => {
    const blocos = { acida: '# Acid', suave: '# Warm, not acid', iniciante: '# Beginner mode' };
    for (const n of NIVEIS) {
      for (const [outro, titulo] of Object.entries(blocos)) {
        if (outro === n) expect(p(n), `${n} precisa de ${titulo}`).toContain(`${titulo}\n`);
        else expect(p(n), `${n} não pode ter ${titulo}`).not.toContain(`${titulo}\n`);
      }
    }
  });

  it('a suave e a iniciante não têm nada do bloco ácido, nem o convite do ChatGPT', () => {
    const acido = [
      'Irony is the default', 'merciless', 'ChatGPT', 'tá logo ali', 'The register is condescending',
      'Acid, sarcastic', 'roasts the slips', 'Talk down to him', 'Stretch vowels when mocking',
      'Praise disguised as insult', 'does annoy you', 'Escalation:',
    ];
    for (const n of ['suave', 'iniciante']) {
      for (const trecho of acido) expect(p(n), `${n} vazou "${trecho}"`).not.toContain(trecho);
    }
  });

  it('a ácida é a de antes, com a mira corrigida', () => {
    const a = p('acida');
    expect(a).toContain('Acid, sarcastic');
    expect(a).toMatch(/Irony is the default, not the seasoning — inside the rule on beginner mistakes/);
    expect(a).toMatch(/o ChatGPT tá logo ali/);
    // O convite sarcástico continua, mas nunca em cima de erro de iniciante.
    expect(a).toMatch(/Never when he is genuinely discouraged, and never in reply to a beginner mistake\./);
    // A escala começa em ZERO, não em "leve": primeiro erro só recebe a correção.
    expect(a).toMatch(/a mistake he makes for the first time gets no jab at all, just the fix/);
    expect(a, 'a escala antiga ironizava o primeiro erro').not.toMatch(/first mistake of the conversation light/);
    expect(a, 'era "roasts every single slip", inclusive o primeiro').not.toMatch(/roasts every single slip/);
    // Os exemplos de fala que zombavam do não-saber saíram.
    expect(a).not.toContain('Como assim você não sabe?');
    expect(a).not.toContain('português com sotaque');
  });

  it('a suave corrige com gentileza e aponta o que ele acertou', () => {
    const s = p('suave');
    expect(s).toMatch(/Quase! É 'I went', não 'I go'/);
    expect(s).toMatch(/No sarcasm about his English, no irony about his mistakes, no condescension/);
    expect(s).toMatch(/Whenever there is something right in the sentence, name it before the fix/);
  });

  it('o modo iniciante: português simples, frases prontas, perguntas com opções, zero ironia', () => {
    const i = p('iniciante');
    expect(i).toMatch(/Explain in simple Portuguese from Brazil/);
    expect(i).toMatch(/Two or three ready sentences with a blank/);
    expect(i).toContain('I usually ___ on weekends.');
    expect(i).toMatch(/^a\) /m);
    expect(i).toMatch(/^b\) /m);
    expect(i).toMatch(/Zero irony, zero sarcasm, zero exasperation/);
    // Digitar é a prática: a letra da opção sozinha não vale.
    expect(i).toMatch(/never just the letter/);
    // Opção em linha não é markdown, e o prompt precisa dizer isso, senão a
    // regra "no bullets" briga com as opções.
    expect(i).toMatch(/That is not a bullet and not markdown/);
  });

  it('THE LAST LINE continua por último em todos, e com o núcleo intacto', () => {
    for (const n of NIVEIS) {
      for (const [memoria, antigas] of [['', ''], ['Mora em Recife.', '- "I have 30 years" (ontem)']]) {
        const t = p(n, memoria, antigas);
        expect(t.match(/^# .+$/gm).at(-1), n).toBe('# THE LAST LINE — this outranks everything above');
        expect(t, n).toMatch(/NEVER ends in plain Portuguese/);
        expect(t, n).toMatch(/ALWAYS ends with a QUESTION in English/);
        expect(t, n).toMatch(/The question has to be about WHAT HE JUST WROTE/);
        expect(t, n).toMatch(/BANNED, no matter how well they seem to fit: "Go on", "Tell me more"/);
        expect(t, n).toMatch(/read your own last line/);
      }
    }
  });

  it('no iniciante, o fecho vem com as opções ou a lacuna embaixo da pergunta', () => {
    const fecho = p('iniciante').slice(p('iniciante').indexOf('# THE LAST LINE'));
    expect(fecho).toMatch(/In beginner mode the question never comes bare/);
    expect(fecho).toMatch(/no options or blank right under it\? Then it is not finished/);
    expect(fecho).toMatch(/^ {2}a\) I went to work\.$/m);
    // E os outros níveis continuam com as formas de antes.
    expect(p('suave')).toMatch(/A sentence to copy, then the question/);
    expect(p('acida')).toMatch(/A Portuguese order, then the question/);
  });

  it('quem prefere falar ouve do Falar numa linha calorosa, sem deboche e sem "ligação"', () => {
    for (const n of NIVEIS) {
      const t = p(n);
      expect(t, n).toMatch(/If he says he would rather talk than type, answer that in ONE warm line and never tease it as laziness/);
      expect(t, n).toMatch(/part of the Plano Pro/);
      // "ligação" e "chamada" só aparecem dentro da proibição.
      expect(t.match(/ligação|chamada/g), n).toEqual(['ligação', 'chamada']);
      expect(t, n).toMatch(/never a "ligação" or a "chamada"/);
      // O diferencial nunca é "os outros não te ouvem".
      expect(t, n).not.toMatch(/não te ouve|can't hear|cannot hear|don't listen/i);
    }
  });

  it('a identidade não muda com o nível', () => {
    for (const n of NIVEIS) {
      const t = p(n);
      expect(t, n).toContain('Cadence "Cady" Mosby');
      expect(t, n).toMatch(/Portuguese from Brazil/);
      expect(t, n).toMatch(/the pronoun is ALWAYS "você", never "cê"/);
      expect(t, n).toMatch(/NORMAL SENTENCE CASE/);
      expect(t, n).toMatch(/NO markdown, no asterisks/);
      expect(t, n).toMatch(/NO VULGARITY, ever/);
      expect(t, n).not.toMatch(/\{\{\s*\w+\s*\}\}/);
    }
  });

  it('nível desconhecido ou ausente monta a suave — nunca a ácida', () => {
    expect(systemPrompt('Ana', '', '', 'furiosa')).toBe(p('suave'));
    expect(systemPrompt('Ana')).toBe(p('suave'));
    expect(systemPrompt('Ana', '', '', undefined)).not.toContain('# Acid\n');
  });
});
