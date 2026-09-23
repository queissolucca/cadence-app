import { describe, it, expect } from 'vitest';
import { lerFonte } from './fonte.js';

/* A CADY DO ESCREVER FALA PORTUGUÊS.

   O sintoma: a pessoa escrevia em português e a resposta vinha só em inglês.
   A causa não era o modelo nem o agente do ElevenLabs — era uma linha no
   system prompt desta rota mandando exatamente isso:

     "Reply ONLY in English — always. If they write in Portuguese, don't
      switch: answer in English and hand them the English phrasing..."

   E o tempo perdido nisso tem uma causa própria: dava pra achar que o Escrever
   usava o agente de voz. Não usa — usa a Anthropic. Por isso o primeiro teste
   aqui é sobre QUEM responde, não sobre o texto. */

const ROTA = lerFonte('app/api/chat/route.js');
const CHAT = lerFonte('components/v2/TextChatClient.js');

/* SÓ O PROMPT DA CONVERSA ABERTA. `lessonPrompt` (drill da Trilha) e
   `cardDrillPrompt` (1 card da Revisão) continuam em inglês de propósito: são
   outras features, e o pedido foi sobre o Escrever da Conversa Aberta. Varrer
   o arquivo inteiro faria este teste falhar por causa delas. */
const ABERTA = ROTA.slice(
  ROTA.indexOf('function systemPrompt('),
  ROTA.indexOf('function lessonPrompt('),
);

describe('quem responde no Escrever', () => {
  it('é a Anthropic, não o ElevenLabs — e isso não pode virar ambíguo', () => {
    expect(ROTA).toContain("from '@anthropic-ai/sdk'");
    expect(ROTA, 'se um dia o Escrever passar pelo ElevenLabs, este teste tem que cair')
      .not.toMatch(/elevenlabs/i);
  });
});

describe('a persona e o idioma do Escrever', () => {
  it('a regra de "só inglês" morreu na conversa aberta', () => {
    expect(ABERTA, 'a asserção precisa estar olhando o prompt certo').toContain('Cady');
    for (const proibido of ['Reply ONLY in English', "don't switch", 'English only']) {
      expect(ABERTA, `"${proibido}" é o bug, não pode voltar`).not.toContain(proibido);
    }
  });

  it('manda escrever em português do Brasil', () => {
    expect(ABERTA).toMatch(/Portuguese from Brazil/);
  });

  /* A CADY ÀS VEZES TERMINAVA O TURNO SÓ EM PORTUGUÊS.

     A causa não era o modelo ignorando o prompt — era o prompt brigando
     consigo mesmo. A regra do português vinha com "all of it, every single
     turn, no exceptions" MAIS um teste de falha nomeado ("if an entire message
     came out in English, you broke the rule"). A regra do fecho em inglês vinha
     sem ênfase, sem exemplo e sem teste de falha, enterrada no meio de um
     parágrafo três seções depois.

     Entre duas instruções que se contradizem, o modelo segue a que insiste
     mais. Estes testes guardam o desempate. */
  it('o fecho em inglês é obrigatório e tem teste de falha próprio', () => {
    expect(ABERTA, 'a seção final precisa existir').toMatch(/# THE LAST LINE/);
    expect(ABERTA).toMatch(/NEVER ends in plain Portuguese/);
    // Sem um teste de falha nomeado, a regra do português ganha de novo.
    expect(ABERTA).toMatch(/you broke the bigger one/);
    // E uma autoverificação antes de mandar, que é o que pega o turno esquecido.
    expect(ABERTA).toMatch(/read your own last line/);
  });

  it('vem POR ÚLTIMO no prompt, e diz que manda mais que o resto', () => {
    /* Posição é ênfase: a última seção é a que fica mais perto da geração.
       Se alguém acrescentar uma seção depois desta, o fecho perde a posição e
       o bug volta — por isso o teste mede ORDEM, não só presença. */
    expect(ABERTA.indexOf('# THE LAST LINE')).toBeGreaterThan(ABERTA.indexOf('# How you write here'));
    expect(ABERTA.indexOf('# THE LAST LINE')).toBeGreaterThan(ABERTA.indexOf('# Acid'));
    expect(ABERTA.trimEnd().endsWith('`;') || ABERTA.lastIndexOf('#') === ABERTA.indexOf('# THE LAST LINE')).toBe(true);
    expect(ABERTA).toMatch(/this outranks everything above/);
  });

  /* "GO ON — TELL ME MORE!" TINHA DUAS CAUSAS, E SÓ UMA ERA O PROMPT.

     A outra era uma frase fixa no servidor (`text || "Go on — tell me more!"`)
     que entrava quando o turno voltava sem bloco de texto. Está coberta em
     'o fallback do servidor' mais abaixo.

     Do lado do prompt, a regra ANTIGA era cúmplice: ela aceitava "uma pergunta
     ou ordem em inglês" e dava como exemplo "Tell me about that in English" —
     que é o mesmo filler com outro nome. Fecho genérico era permitido, então
     apareceu. */
  it('o fecho é pergunta, e específica ao que a pessoa escreveu', () => {
    expect(ABERTA).toMatch(/ALWAYS ends with a QUESTION in English/);
    // O teste da especificidade é o que separa pergunta de filler.
    expect(ABERTA).toMatch(/if that same question would fit word for word under any other message/);
    expect(ABERTA).toMatch(/Three words is not a dodge, it is a door/);
  });

  it('proíbe os fillers pelo nome', () => {
    const i = ABERTA.indexOf('BANNED, no matter how well they seem to fit');
    expect(i, 'a lista de proibidos precisa existir').toBeGreaterThan(-1);
    const lista = ABERTA.slice(i, i + 420);
    for (const filler of ['Go on', 'Tell me more', 'Keep going', 'What else?', 'Tell me about that in English']) {
      expect(lista, `"${filler}" tem que estar proibido pelo nome`).toContain(filler);
    }
    /* E o motivo junto: sem ele o modelo troca de filler em vez de parar de
       usar filler — inventa um "So?" e cumpre a letra da regra. */
    expect(ABERTA).toMatch(/asks for VOLUME instead of asking for something/);
  });

  it('as outras formas de fecho sobrevivem, mas terminando em pergunta', () => {
    // Uma forma só, repetida turno a turno, o olho aprende a pular.
    expect(ABERTA).toMatch(/A sentence to copy, then the question/);
    expect(ABERTA).toMatch(/A Portuguese order, then the question/);
  });

  it('é a Cady Mosby do agente de voz, não a Whitfield antiga', () => {
    expect(ABERTA).toContain('Cady" Mosby');
    expect(ROTA, 'a bio antiga saiu do arquivo inteiro').not.toContain('Whitfield');
  });

  it('escreve em caixa normal, com energia — nunca tudo minúsculo', () => {
    /* O prompt do painel manda "Format: lowercase". Aqui não: quem lê está
       aprendendo a ESCREVER inglês, e professor sem maiúscula ensina aluno sem
       maiúscula. */
    expect(ABERTA, 'a regra de minúscula não pode voltar').not.toMatch(/Format: lowercase/);
    expect(ABERTA).toMatch(/NORMAL SENTENCE CASE/);
    expect(ABERTA).toMatch(/after every period, question mark and exclamation point/);
    expect(ABERTA).toMatch(/Oi! Eu sou a Cady!/);
    // Animada E ácida: se um dia "merciless" sair, virou outra personagem.
    expect(ABERTA).toMatch(/Animated does not mean soft/);
    expect(ABERTA).toMatch(/merciless/);
  });

  it('trata o usuário por "você", não por "cê"', () => {
    expect(ABERTA).toMatch(/the pronoun is ALWAYS "você", never "cê"/);
    /* Varre os exemplos de fala do prompt: "cê" só pode aparecer dentro da
       própria proibição, em nenhum outro lugar. Era o registro antigo, e um
       exemplo esquecido ensina o modelo o oposto da regra.

       NÃO use `\b` aqui. O `\w` do JavaScript é [A-Za-z0-9_]: `ê` não está
       nele, então depois de `ê` NUNCA existe fronteira de palavra e /cê\b/
       casa zero vezes — com o texto errado na frente. A primeira versão deste
       teste passou por esse buraco. O jeito certo é olhar o caractere vizinho:
       `cê` colado num "o" é "você" e não conta. */
    const solto = /(^|[^A-Za-zÀ-ÿ])[Cc]ê(?![A-Za-zÀ-ÿ])/g;
    expect(ABERTA.match(solto)?.length, 'só as duas menções da regra que proíbe').toBe(2);
    // E o controle, pra provar que o regex realmente enxerga algo:
    expect('Cê tá aí, você?'.match(solto)?.length, 'o regex tem que achar o Cê e ignorar o você').toBe(1);
  });

  it('não xinga — e os palavrões só aparecem sendo proibidos', () => {
    /* A Cady nasceu "foul mouthed". O pedido foi baixar a agressividade, e
       tirar só "porra" e "caralho" seria trocar de palavra, não de registro:
       "puta que pariu" e "vá se foder" continuariam na lista.

       Os termos PRECISAM aparecer no prompt uma vez, dentro da proibição —
       proibição que não nomeia o que proíbe não proíbe nada. Por isso o teste
       conta ocorrências em vez de exigir ausência: uma é a regra, duas é um
       exemplo que voltou. */
    expect(ABERTA).toMatch(/NO VULGARITY, ever/);
    for (const palavra of ['porra', 'caralho', 'caceta', 'puta que pariu', 'vá se foder', 'merda', 'foda']) {
      const n = (ABERTA.match(new RegExp(palavra, 'gi')) || []).length;
      expect(n, `"${palavra}" tem que aparecer só na linha que o proíbe`).toBe(1);
    }
    for (const palavra of ['fuck', 'shit', 'bullshit']) {
      expect(ABERTA.toLowerCase(), `"${palavra}" não pode estar no prompt`).not.toContain(palavra);
    }
  });

  it('a mordida vem da ironia, não do palavrão', () => {
    // Sem esta justificativa o modelo lê "não xingue" como "seja educada", e a
    // personagem inteira se desmancha.
    expect(ABERTA).toMatch(/a swear is the laziest way to sound harsh/);
    expect(ABERTA).toMatch(/Irony is the default/);
    // E o que impede de virar professora simpática continua lá.
    expect(ABERTA).toMatch(/merciless/);
  });

  it('mantém o freio: o ácido é sobre a frase, nunca sobre a pessoa', () => {
    // Sem esta lista o prompt é só "seja cruel", e aí ele erra o alvo.
    expect(ABERTA).toMatch(/Off limits, no exceptions: appearance, body, family, origin, religion, sexuality/);
    expect(ABERTA).toMatch(/never at who he is/);
  });

  it('proíbe markdown, porque a bolha não tem parser', () => {
    // TextChatClient renderiza com whiteSpace: pre-wrap. Um `**` do modelo
    // aparece como `**` na tela.
    expect(CHAT).toMatch(/whiteSpace: 'pre-wrap'/);
    expect(ABERTA).toMatch(/NO markdown, no asterisks/);
  });

  it('não sobra nenhuma variável de painel sem valor', () => {
    /* As variáveis de duplo-colchete só existem no painel do ElevenLabs. Se
       uma passar batida pra cá, chega literal no prompt e o modelo lê o
       colchete. A varredura é na FONTE sem comentários (lerFonte): os
       comentários deste projeto citam essas variáveis pra explicar de onde
       vieram, e uma asserção sobre o texto cru falharia por causa da própria
       documentação. Já aconteceu outras vezes aqui — é pra isso que
       tests/fonte.js existe. */
    expect(ABERTA, 'variável do ElevenLabs não resolvida no prompt').not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});

describe('as seções condicionais do prompt', () => {
  /* Variável vazia não é neutra num prompt que tem instrução em cima dela: foi
     assim que `unit_*` em branco renderizou "Lesson:  — focus:" no agente de
     voz e fez o modelo desligar a chamada sozinho. Sem dado, a seção não
     pode existir. */
  it('memória e callbacks só aparecem quando há dado', () => {
    expect(ABERTA).toMatch(/\$\{pastCorrections \? `/);
    expect(ABERTA).toMatch(/\$\{memoryBlock \? `/);
  });

  it('as correções antigas vêm da Revisão, e em paralelo com a memória', () => {
    expect(ROTA).toMatch(/from\('review_saved'\)/);
    expect(ROTA).toMatch(/eq\('category', 'correction'\)/);
    const i = ROTA.indexOf('const [memoryBlock, pastCorrections]');
    expect(i, 'as duas leituras precisam sair juntas').toBeGreaterThan(-1);
    expect(ROTA.slice(i, i + 200)).toContain('Promise.all');
  });
});

describe('a primeira bolha da tela', () => {
  it('abre em português, porque o system prompt não alcança string de cliente', () => {
    expect(CHAT).not.toContain("I'm Cady. What do you wanna talk about today?");
    expect(CHAT).toMatch(/Oi \$\{name \|\| 'você'\}! Eu sou a Cady!/);
    expect(CHAT, 'a frase antiga saiu').not.toMatch(/calado não/);
    // Sem o artigo: ele é "o" no meio da frase e "O" depois de ponto, e a
    // regra de caixa normal faz isso variar legitimamente.
    expect(CHAT).toMatch(/importante é tentar e ir aprendendo comigo/);
    // E ainda assim entrega uma linha em inglês pra pessoa digitar: é o método.
    /* Sem fixar a pontuação: o que importa é a bolha entregar UMA linha em
       inglês pra pessoa digitar. Era `today\.` e travou quando a frase virou
       "today!" — teste vermelho por causa de um ponto de exclamação é teste
       medindo estilo, não comportamento. */
    expect(CHAT).toMatch(/Tell me what you did today[.!]/);
  });
});

describe('o convite pra experimentar o Falar', () => {
  it('existe, e usa o mesmo emoji do botão', () => {
    expect(CHAT).toContain('Seria melhor aprender como falar né?');
    // O convite manda clicar num ícone logo acima; emoji diferente do botão
    // faria a pessoa procurar um botão que não existe.
    const CONVERSAR = lerFonte('components/v2/ConversarView.js');
    expect(CONVERSAR).toContain('🎙 Falar');
    expect(CHAT).toContain('🎙 Falar');
  });

  it('aparece a cada 5 a 8 mensagens, sorteado — não é metrônomo', () => {
    expect(CHAT).toMatch(/5 \+ Math\.floor\(Math\.random\(\) \* 4\)/);
  });

  it('é só tela: não vai pro modelo nem pro banco', () => {
    /* Se fosse pro modelo, chegaria como fala da Cady e ela passaria a achar
       que convidou. Se fosse pro banco, voltaria no prior_context de uma
       retomada dias depois, com o mesmo efeito. */
    expect(CHAT).toMatch(/const paraFora = \(lista\) => lista\.filter\(\(m\) => m\.role !== 'convite'\)/);
    expect(CHAT).toMatch(/const history = paraFora\(withYou\)/);
    expect(CHAT).toMatch(/persist\(paraFora\(withReply\)\)/);
  });

  it('não interrompe lição nem drill de card', () => {
    const i = CHAT.indexOf('faltamPraConvite.current = INTERVALO_CONVITE()');
    expect(i).toBeGreaterThan(-1);
    expect(CHAT.slice(i - 300, i)).toMatch(/if \(!unit && !cardDrill\)/);
  });
});

describe('o teto de 500 caracteres na caixa', () => {
  it('são DUAS camadas — o atributo e o corte no estado', () => {
    /* `maxLength` é atributo de UI: não vale pra valor setado por código e some
       se alguém editar o atributo no inspetor. O slice é o que garante que o
       ESTADO nunca passa de 500 — e é o estado que acaba indo pra API. */
    expect(CHAT).toMatch(/const MAX_CARACTERES = 500;/);
    expect(CHAT, 'o atributo é quem trunca a colagem').toMatch(/maxLength=\{MAX_CARACTERES\}/);
    expect(CHAT, 'e o slice é o cinto').toMatch(/setInput\(e\.target\.value\.slice\(0, MAX_CARACTERES\)\)/);
  });

  it('o limite é dito, e só quando chega perto', () => {
    // Caixa que para de aceitar tecla sem dizer nada lê como travamento; e
    // contador visível o tempo todo transforma escrever numa prova.
    expect(CHAT).toMatch(/AVISA_A_PARTIR_DE/);
    expect(CHAT).toMatch(/input\.length >= AVISA_A_PARTIR_DE/);
    expect(CHAT).toMatch(/caracteres restantes/);
  });

  it('o número não fica solto em três lugares diferentes', () => {
    // O 500 literal só pode aparecer na constante e no texto que o anuncia.
    const literais = (CHAT.match(/\b500\b/g) || []).length;
    expect(literais, 'usar MAX_CARACTERES em vez de repetir o número').toBeLessThanOrEqual(2);
  });
});

describe('o fallback do servidor quando a resposta vem sem texto', () => {
  const ROTA = lerFonte('app/api/chat/route.js');

  /* A frase que o usuário via repetida não era do modelo: era
     `reply: text || "Go on — tell me more!"`. Quando o turno terminava sem
     bloco de texto — tipicamente o modelo gastando os tokens na chamada do
     save_to_review —, o servidor entregava esse bordão. Sempre idêntico,
     porque foi escrito à mão uma vez. */
  it('as frases fixas antigas não existem mais', () => {
    expect(ROTA).not.toContain('Go on — tell me more!');
    expect(ROTA).not.toContain("Let's keep going — what's on your mind?");
  });

  it('pergunta de novo em vez de inventar a resposta', () => {
    expect(ROTA).toMatch(/async function comTexto\(/);
    expect(ROTA, 'os dois retornos passam pelo reparo').toMatch(/reply: await comTexto\(textoDe\(resp\)/);
    expect(ROTA).toMatch(/reply: await comTexto\(''/);
  });

  it('a segunda tentativa vai SEM ferramenta — é o que garante texto', () => {
    /* Com `tools` disponível, a segunda ida pode voltar em tool_use de novo e
       o problema se repete. Sem ferramenta, não existe resposta que não seja
       texto. */
    const i = ROTA.indexOf('async function comTexto(');
    const corpo = ROTA.slice(i, ROTA.indexOf('\n}', i));
    expect(corpo).toMatch(/client\.messages\.create/);
    expect(corpo, 'passar tools aqui reabriria o buraco').not.toMatch(/tools:/);
  });

  it('o teto de tokens deixou de ser apertado', () => {
    // 400 era o que fazia o turno estourar dentro da chamada da ferramenta.
    const m = ROTA.match(/max_tokens: (\d+),\s+\/\/ 400 era apertado/);
    expect(m, 'a chamada principal precisa do comentário explicando o teto').toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(600);
  });
});
