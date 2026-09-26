import { describe, it, expect } from 'vitest';
import { querFalar, normalizar, ofertaLiberada, RESPIRO_ENTRE_OFERTAS } from '../lib/cady/querFalar.js';
import { lerFonte } from './fonte.js';

/* "POXA, MAS EU QUERIA FALAR" VIRA OFERTA DO FALAR, NA HORA.

   O Escrever é o grátis e o Falar é o pago. Quando a pessoa DIZ, no Escrever,
   que preferia estar falando, a tela oferece o Falar logo depois da resposta da
   Cady — com um botão que faz o mesmo que o 🎙 Falar lá de cima.

   As duas listas abaixo são o contrato. A de NEGATIVOS importa mais que a de
   positivos: oferecer o microfone a quem escreveu "quero falar sobre meu
   trabalho" é a tela mostrando que não leu. Perder um positivo custa pouco — o
   convite sorteado aparece daqui a algumas mensagens de qualquer jeito. */

describe('as frases do dono', () => {
  it.each([
    'Poxa mas eu queria falar',
    'dá preguiça de escrever, era mais fácil falar',
    'I like, talking better',
  ])('"%s" dispara a oferta', (frase) => {
    expect(querFalar(frase)).toBe(true);
  });
});

describe('frases no mesmo sentido disparam', () => {
  it.each([
    // PT, da lista do pedido
    'prefiro fala',
    'queria falar',
    'mais facil falar',
    'preguiça de escrever',
    'cansei de digitar',
    'não gosto de escrever',
    'posso falar?',
    'tem como falar por voz',
    'manda áudio',
    'quero conversar por voz',
    // PT, variações
    'Prefiro falar',
    'prefiro falar do que escrever',
    'Eu prefiro falar em vez de escrever',
    'queria falar e não escrever',
    'Cady, posso falar com você?',
    'dá pra falar em vez de escrever?',
    'como faço pra falar com você?',
    'tô com preguiça de escrever',
    'que preguiça de digitar kkkk',
    'sinceramente, dá preguiça de escrever aqui',
    'cansei de escrever, bora falar',
    'falar é mais fácil pra mim',
    'seria bem melhor por áudio',
    'falo melhor do que escrevo',
    'sou melhor falando',
    'escrever é chato',
    'digitar cansa',
    'odeio digitar',
    'não quero escrever',
    'posso te mandar um áudio?',
    'vc me ouve?',
    'você tem voz?',
    'tem modo de voz?',
    'vamos conversar por voz',
    'rola falar?',
    'Hoje foi corrido. Poxa, queria falar.',
    // EN, da lista do pedido
    'I want to speak',
    'I prefer talking',
    'I prefer speaking',
    "I'd rather talk",
    'can I talk',
    'can we talk instead',
    // EN, variações
    'I rather talk',
    'I prefer speak',
    'I wanna speak',
    'I would like to speak',
    'I want to talk by voice',
    'i prefer talking to typing',
    'I like to talk more',
    'I like more talking than writing',
    'Could we speak instead?',
    'can i speak?',
    "I'm tired of typing",
    'too lazy to type',
    'typing is so boring',
    "I don't like writing",
    'talking is easier',
    "it's easier to talk",
    'can I send you a voice note?',
    'do you have a voice?',
    'can we use voice?',
    'voice mode?',
    // pedidos óbvios que escapavam (achado da revisão)
    'queria falar com você por voz',
    'Cady, queria falar com você por voz',
    'queria falar com vc por audio',
    'prefiro falar com voce por audio',
    'prefiro falar doq escrever',
    'prefiro falar dq escrever',
    'pode ser por áudio?',
    'posso mandar um audinho?',
    'posso te falar por áudio?',
    'lets talk by voice',
    "let's just talk instead",
    'is easier to speak',
    'is possible to speak?',
    // o pedido e, depois, só muleta ou só o meio
    'Queria falar. Sério.',
    'Poxa. Queria falar. Tipo, por voz.',
    'I want to speak. By voice.',
    'Estou no trânsito. Posso falar?',
  ])('"%s"', (frase) => {
    expect(querFalar(frase)).toBe(true);
  });
});

describe('falar DE alguma coisa não é pedir pra falar POR voz', () => {
  it.each([
    // da lista do pedido
    'quero falar sobre meu trabalho',
    'I want to talk about my trip',
    'I like talking to my friends',
    'meu chefe fala muito',
    'falar em público me dá medo',
    // assunto, idioma e meta de estudo
    'Posso falar sobre futebol?',
    'posso falar uma coisa?',
    'posso falar em português?',
    'prefiro falar em português',
    'prefiro falar pessoalmente',
    'quero falar inglês fluente',
    'queria falar mais inglês no trabalho',
    'quero aprender a falar melhor',
    'falar melhor',
    'I want to speak English fluently',
    'I want to speak better',
    "I'd rather talk about something else",
    'I prefer talking to people in person',
    'Can we talk about movies?',
    'can I speak Portuguese?',
    'can you speak slower',
    'tem como falar mais devagar?',
    'vamos falar sobre viagens',
    // pergunta de quem estuda, que é a mensagem mais comum do Escrever
    'Posso falar assim?',
    'é melhor falar assim?',
    'como faço pra falar melhor?',
    'How do I speak more naturally?',
    'Can we speak English?',
    'prefiro falar a verdade',
    'quero falar com o suporte',
    'talk to you later',
    // outro sujeito
    'meu filho queria falar com a professora',
    'ele queria falar',
    'ela prefere falar',
    'minha mãe manda áudio o dia todo',
    'I went to the park and talked with my friends',
    // "fala" é oi, e "pode falar" é "vai em frente"
    'Fala Cady, tudo bem?',
    'fala!',
    'pode falar!',
    'você fala',
    // negação, e o contrário
    'não quero falar',
    "I don't want to talk",
    'prefiro escrever',
    'I like writing better',
    // voz que não é o modo voz
    'I lost my voice yesterday',
    'her voice is beautiful',
    'my voice is bad',
    'the voice',
    'voice acting is cool',
    'o áudio do vídeo estava ruim',
    // desabafo sobre OUTRA escrita, e dificuldade não é preferência
    'tenho preguiça de escrever relatórios no trabalho',
    'cansei de escrever e-mails hoje',
    'não gosto de escrever redação',
    'I hate writing essays',
    'não quero escrever em inglês',
    'writing is hard',
    'speaking is the hardest part for me',
    // genérico demais pra ser pedido de voz
    'quero conversar',
    'vamos conversar!',
    "let's talk!",
    'Can we talk?',
    'I just want to talk',
    'I want to talk',
    'I love talking',
    'I like talking',
    'falar',
    'speaking',
    'eu queria falar com você',
    // ditado, e resposta que por acaso tem a palavra
    'mais fácil falar do que fazer',
    'prefiro ao vivo',
    'prefiro voz',
    // citação: pergunta SOBRE a frase, não a diz
    'Is "I\'d rather talk" correct?',
    'Como se diz "prefiro falar" em inglês?',
    /* A MENSAGEM INTEIRA DECIDE (achado da revisão). Os negativos lá de cima,
       com a vírgula trocada por ponto: o assunto vem na oração seguinte, e
       antes só a primeira era olhada. */
    'I hate writing. Essays are the worst.',
    'Tenho preguiça de escrever. No trabalho é só relatório.',
    'Cansei de escrever! Hoje foram 40 e-mails no trabalho.',
    'Não quero escrever. Em inglês eu travo.',
    'I prefer talking. In person, I mean.',
    'I want to speak. English is important for my job.',
    // licença pra CONTAR, não pra falar por voz
    'Posso falar? Acho que meu inglês piorou muito.',
    'Posso falar? Eu discordo de você.',
    'can I talk to you? I need advice',
    'posso te falar?',
    'Posso te falar? Hoje foi um dia horrível no trabalho.',
    'Posso te falar? Eu odeio meu chefe kkk',
    // meta de estudo antes do "quero falar"
    'Meu objetivo é simples: quero falar.',
    'Por que estou aprendendo? Quero falar.',
    'My goal? I want to speak.',
    'Why am I learning? I want to speak.',
    // desabafo comprido antes: "queria falar" é "queria falar disso"
    'Tive um dia horrível no trabalho, meu chefe gritou comigo e eu fiquei mal. Queria falar.',
    // resposta de vocabulário, hábito e mensagem de celular
    'Voice. She has a beautiful voice.',
    // "voice" sozinho é a resposta a "como se diz 'voz'?", não pedido de Falar.
    'voice',
    'Voice.',
    'out loud',
    'aloud',
    'eu mando audio',
    'mando áudio',
    'eu mando audio. minha mae nao le mensagem',
    'I hate texting.',
    'I dont like texting',
    'texting is boring',
    'Texting or calling? I prefer talking.',
  ])('"%s"', (frase) => {
    expect(querFalar(frase)).toBe(false);
  });
});

/* RESPOSTA À PERGUNTA DA CADY NÃO É PEDIDO (achado da revisão). Ela pergunta
   "X ou Y?" o tempo todo, e o modo iniciante dá as respostas prontas. Com
   falar de um lado e escrever/ler/mensagem do outro na pergunta dela, "I
   prefer talking" é a resposta digitada. */
describe('a última fala da Cady', () => {
  it.each([
    ['I prefer talking', 'Boa! Do you prefer texting or talking with friends?'],
    ['Speaking is easier', 'Olha só! What is easier for you in English, reading or speaking?'],
    ['I prefer talking.', 'Texting or calling?\na) I prefer texting.\nb) I prefer talking.'],
    ['Talking is better', 'Hm. Calling or texting your mom, what is better?'],
  ])('"%s" respondendo a "%s" não dispara', (frase, daCady) => {
    expect(querFalar(frase, daCady)).toBe(false);
    // Sem a pergunta, a mesma frase continua sendo pedido.
    expect(querFalar(frase)).toBe(true);
  });

  it.each([
    ['poxa, queria falar', 'Isso! What did you talk about with your boss?'],
    ['dá preguiça de escrever, era mais fácil falar', 'Quase! Agora escreve isso em inglês. Where did you go?'],
    ['Poxa mas eu queria falar', 'Oi Ana! Eu sou a Cady! Tente escrever em inglês. Tell me what you did today!'],
    // Falar e escrever FORA da pergunta (a Cady acolhendo um pedido) não contam.
    ['sim, quero falar', 'Falar é bem mais gostoso que escrever, né.\nSo, what did you do today?'],
  ])('"%s" depois de "%s" continua disparando', (frase, daCady) => {
    expect(querFalar(frase, daCady)).toBe(true);
  });

  it('fala da Cady que não é texto não atrapalha', () => {
    for (const x of [undefined, null, 42, {}]) expect(querFalar('queria falar', x)).toBe(true);
  });
});

describe('tolerante a acento, caixa, pontuação e dedo escorregando', () => {
  it.each([
    'PREFIRO FALAR!!!',
    'prefiro   falar...',
    'Prefiro falar 😅',
    'é mais fácil falar',
    'e mais facil falar',
    'poxaaa queria falarrr',
    'hahaha prefiro falar',
    'n gosto de escrever',
    'dá preguiça de escrever , era mais fácil falar',
    'pregiça de escrever',
    'I LIKE, TALKING BETTER',
    'i like talking better lol',
    'Id rather talk',
  ])('"%s"', (frase) => {
    expect(querFalar(frase)).toBe(true);
  });

  it('a normalização corta em orações e engole a vírgula', () => {
    /* A vírgula some (e não corta) por causa do "I like, talking better": cortar
       ali partiria o verbo ao meio. Ponto, interrogação e quebra de linha
       cortam — é onde uma ideia termina. */
    expect(normalizar('Oi Cady! Dá preguiça de escrever, sabe?')).toEqual(['oi cady', 'da preguica de escrever sabe']);
    expect(normalizar("I'd rather talk")).toEqual(['i would rather talk']);
  });

  it('entrada que não é texto não dispara nem quebra', () => {
    for (const x of [undefined, null, '', '   ', 42, {}, []]) expect(querFalar(x)).toBe(false);
  });

  it('mensagem absurda não trava a tela', () => {
    /* O teste roda em cada envio, no navegador. Uma regex com caminhos demais
       pra mesma frase trava a aba — por isso a gramática não repete palavra
       dentro de um laço, e oração longa (relato, não pedido) nem é testada. */
    const absurdas = [
      `${'eu mas poxa ne '.repeat(40)}x`,
      `prefiro falar ${'ne '.repeat(27)}x`,
      `${'voice chat '.repeat(14)}voice x`,
      `${'da preguica de escrever '.repeat(7)}x`,
      `${'queria falar por voz '.repeat(7)}x`,
      `${'poxa ne sabe '.repeat(9)}x`,
      `${'queria falar com voce por voz '.repeat(5)}x`,
      `${'posso falar. '.repeat(40)}x`,
      'a'.repeat(5000),
    ];
    querFalar('aquece');   // a primeira chamada compila a regex
    const t = performance.now();
    for (const s of absurdas) querFalar(s);
    expect(performance.now() - t).toBeLessThan(250);
  });
});

describe('o respiro entre uma oferta e a próxima', () => {
  it('são 3 mensagens da pessoa', () => {
    expect(RESPIRO_ENTRE_OFERTAS).toBe(3);
  });

  it('a primeira sempre pode; a seguinte só depois de 3 mensagens', () => {
    expect(ofertaLiberada(1, null)).toBe(true);
    expect(ofertaLiberada(2, 1)).toBe(false);
    expect(ofertaLiberada(3, 1)).toBe(false);
    expect(ofertaLiberada(4, 1)).toBe(true);
  });
});

describe('a oferta no Escrever', () => {
  const CHAT = lerFonte('components/v2/TextChatClient.js');
  const VIEW = lerFonte('components/v2/ConversarView.js');
  const OFERTA = (CHAT.match(/const OFERTA_FALAR = '([^']+)'/) || [])[1];

  it('usa o detector, com o texto que a pessoa mandou e a última fala da Cady', () => {
    expect(CHAT).toMatch(/import \{[^}]*querFalar[^}]*\} from '\.\.\/\.\.\/lib\/cady\/querFalar'/);
    expect(CHAT).toMatch(/querFalar\(text, ultimaDaCady\)/);
    // A última fala da Cady é dela mesmo: nem a da pessoa, nem convite/oferta.
    expect(CHAT).toMatch(/const ultimaDaCady = \[\.\.\.messages\]\.reverse\(\)\.find\(\(m\) => m\.role === 'coach'\)/);
  });

  it('entra DEPOIS da resposta da Cady — ela nunca é interrompida', () => {
    const resposta = CHAT.indexOf('setMessages(withReply)');
    const oferta = CHAT.indexOf('text: OFERTA_FALAR');
    expect(resposta).toBeGreaterThan(-1);
    expect(oferta).toBeGreaterThan(resposta);
  });

  it('é só tela, como o convite: entra como role convite, que paraFora tira', () => {
    /* Mesmo mecanismo do convite de propósito. Um role novo exigiria lembrar
       de filtrá-lo em cada saída (modelo, banco, memória) — e a primeira que
       esquecesse mandaria a propaganda como fala da Cady. */
    expect(CHAT).toMatch(/\{ role: 'convite', text: OFERTA_FALAR, acao: true \}/);
    expect(CHAT).toMatch(/const paraFora = \(lista\) => lista\.filter\(\(m\) => m\.role !== 'convite'\)/);
  });

  it('a extração de memória também não recebe convite nem oferta', () => {
    // Era `messages: msgs`, o estado cru: o convite chegava lá como "Coach: …".
    expect(CHAT).toMatch(/const conversa = paraFora\(msgs\)/);
    expect(CHAT).toMatch(/JSON\.stringify\(\{ messages: conversa \}\)/);
    expect(CHAT).not.toMatch(/JSON\.stringify\(\{ messages: msgs \}\)/);
  });

  it('só na conversa aberta, e só com o botão ligado', () => {
    expect(CHAT).toMatch(/const naConversaAberta = !unit && !cardDrill && typeof onQuerFalar === 'function'/);
    expect(CHAT).toMatch(/const pediuPraFalar = naConversaAberta && /);
    expect(CHAT).toMatch(/const ofertaRecente = naConversaAberta && /);
    // Sem callback (lição, drill de card) não há botão, e a oferta não aparece.
    for (const arq of ['components/v2/LessonRunner.js', 'components/v2/CardPracticeDialog.js']) {
      expect(lerFonte(arq), arq).not.toContain('onQuerFalar');
    }
  });

  it('vence o convite sorteado e reinicia a contagem dele', () => {
    const i = CHAT.indexOf('if (pediuPraFalar) {');
    expect(i).toBeGreaterThan(-1);
    const bloco = CHAT.slice(i, CHAT.indexOf('}', i));
    expect(bloco).toContain('faltamPraConvite.current = INTERVALO_CONVITE()');
    // `else if`: nunca oferta e convite na mesma resposta.
    expect(CHAT).toMatch(/\} else if \(faltamPraConvite\.current <= 0\) \{/);
  });

  it('respeita o respiro de 3 mensagens', () => {
    expect(CHAT).toMatch(/const liberada = ofertaLiberada\(estaMensagem, ultimaOferta\.current\)/);
    expect(CHAT).toMatch(/ultimaOferta\.current = estaMensagem/);
    /* Dentro do respiro, a tela não oferece — e avisa a Cady que ofereceu há
       pouco, senão ela mesma vende o Falar no lugar da tela. O detector vai
       SEM a fala da Cady: ela pode ter acabado de acolher o pedido falando de
       "falar" e "escrever", e o "sim, quero falar!" é o pedido de novo. */
    expect(CHAT).toMatch(/const pediuPraFalar = naConversaAberta && liberada && querFalar\(text, ultimaDaCady\)/);
    expect(CHAT).toMatch(/const ofertaRecente = naConversaAberta && !liberada && querFalar\(text\)/);
  });

  it('o botão é o mesmo clique do 🎙 Falar lá de cima', () => {
    expect(CHAT).toMatch(/line\.acao && onQuerFalar && \(/);
    expect(CHAT).toMatch(/onClick=\{onQuerFalar\}/);
    expect(CHAT).toContain('🎙 Falar agora');
    // …e quem liga os dois é o mesmo irParaVoz, com a porta do Plano Pro junto.
    expect(VIEW).toMatch(/onQuerFalar=\{irParaVoz\}/);
    expect(VIEW).toMatch(/pedirPlano\(FALA, \(\) => setMode\('text'\)\)/);
  });

  /* FECHAR O POPUP VOLTA PRA MESMA CONVERSA (achado da revisão).

     Era um ternário: o modo voz DESMONTAVA o TextChatClient, e fechar o popup
     do Plano Pro montava outro. Quem não pagou, clicou em "🎙 Falar agora" e
     fechou o popup via a saudação de novo, com a conversa sumida da tela, os
     acertos zerados e uma conversa nova no banco a cada ida e volta. */
  it('sem o plano, o Escrever fica montado (escondido) durante a vitrine do Falar', () => {
    expect(VIEW, 'o ternário que desmontava o texto voltou').not.toMatch(/mode === 'text' \? \(\s*<TextChatClient/);
    const texto = VIEW.indexOf('<TextChatClient');
    const voz = VIEW.indexOf('<ConversationClient');
    const antesDoTexto = VIEW.slice(VIEW.lastIndexOf('{(', texto), texto);
    expect(antesDoTexto).toContain("(mode === 'text' || !temPlano) && (");
    expect(antesDoTexto).toContain("<div style={{ display: mode === 'text' ? 'contents' : 'none' }}>");
    // A voz só monta no modo voz, e continua vitrine pra quem não pagou.
    expect(VIEW.slice(VIEW.lastIndexOf('{', voz), voz)).toContain("{mode === 'voice' && (");
    expect(VIEW).toMatch(/vitrine=\{!temPlano\}/);
    /* Escondida com display none, a caixa de rolagem perde a posição: ao
       reaparecer, o chat desce pro fim de novo em vez de abrir no começo. */
    expect(VIEW).toMatch(/visivel=\{mode === 'text'\}/);
    expect(CHAT).toMatch(/if \(visivel === false\) return;/);
    expect(CHAT).toMatch(/\}, \[messages, sending, visivel\]\);/);
  });

  it('o texto é curto, em português, e fala de conversa — nunca de ligação', () => {
    expect(OFERTA, 'a constante OFERTA_FALAR sumiu?').toBeTruthy();
    expect(OFERTA.length).toBeLessThanOrEqual(90);
    expect(OFERTA).toMatch(/convers/i);
    expect(OFERTA).not.toMatch(/liga[cç][aã]o|ligar|chamada/i);
    // Não comenta a preguiça: a pessoa disse do que gosta, a tela só abre a porta.
    expect(OFERTA).not.toMatch(/pregui/i);
  });

  /* LOTE DE 2026-09-26: a oferta, os sinais de tom e o loop novo juntos.

     Três branches mexeram no mesmo send(). O que tem que continuar valendo com
     as três juntas: a Cady fica sabendo que a oferta vai aparecer (senão ela
     mesma vende o Falar, e a pessoa lê duas propagandas); e a oferta não pesa
     no tom — os acertos e as correções seguidas saem do texto que a PESSOA
     mandou e do `saved` da resposta, nunca de uma bolha da tela. */
  it('avisa a /api/chat quando a oferta vai aparecer, e só nesse caso', () => {
    expect(CHAT).toMatch(/\.\.\.\(pediuPraFalar \? \{ ofertaFalar: true \} : ofertaRecente \? \{ ofertaRecente: true \} : \{\}\)/);
    // O aviso sai no MESMO fetch da mensagem, junto dos sinais de tom.
    const i = CHAT.indexOf("fetch('/api/chat'");
    const corpo = CHAT.slice(i, CHAT.indexOf('});', i));
    expect(corpo).toContain('ofertaFalar: true');
    expect(corpo).toContain('tom: { ...sinaisTom.current');
    // E a decisão da oferta vem antes do fetch — não dá pra avisar depois.
    expect(CHAT.indexOf('const pediuPraFalar =')).toBeLessThan(i);
  });

  it('a oferta não entra na conta do tom', () => {
    // Os sinais saem do texto dela, do `saved` e do `corrigiu` — a lista de mensagens não entra.
    expect(CHAT).toMatch(/sinaisTom\.current = proximosSinaisTom\(sinaisTom\.current, text, saved, corrigiu\)/);
    // E o histórico que o servidor lê pra "travando" já vai sem convite nem oferta.
    expect(CHAT).toMatch(/const history = paraFora\(withYou\)/);
  });

  it('o convite sorteado continua igual', () => {
    expect(CHAT).toContain('Seria melhor aprender como falar né?');
  });
});
