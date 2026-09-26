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
    'voice',
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
  ])('"%s"', (frase) => {
    expect(querFalar(frase)).toBe(false);
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

  it('usa o detector, com o texto que a pessoa mandou', () => {
    expect(CHAT).toMatch(/import \{[^}]*querFalar[^}]*\} from '\.\.\/\.\.\/lib\/cady\/querFalar'/);
    expect(CHAT).toMatch(/querFalar\(text\)/);
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
    expect(CHAT).toMatch(/const pediuPraFalar = !unit && !cardDrill && typeof onQuerFalar === 'function'/);
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
    expect(CHAT).toMatch(/ofertaLiberada\(estaMensagem, ultimaOferta\.current\)/);
    expect(CHAT).toMatch(/ultimaOferta\.current = estaMensagem/);
  });

  it('o botão é o mesmo clique do 🎙 Falar lá de cima', () => {
    expect(CHAT).toMatch(/line\.acao && onQuerFalar && \(/);
    expect(CHAT).toMatch(/onClick=\{onQuerFalar\}/);
    expect(CHAT).toContain('🎙 Falar agora');
    // …e quem liga os dois é o mesmo irParaVoz, com a porta do Plano Pro junto.
    expect(VIEW).toMatch(/onQuerFalar=\{irParaVoz\}/);
    expect(VIEW).toMatch(/pedirPlano\(FALA, \(\) => setMode\('text'\)\)/);
  });

  it('o texto é curto, em português, e fala de conversa — nunca de ligação', () => {
    expect(OFERTA, 'a constante OFERTA_FALAR sumiu?').toBeTruthy();
    expect(OFERTA.length).toBeLessThanOrEqual(90);
    expect(OFERTA).toMatch(/convers/i);
    expect(OFERTA).not.toMatch(/liga[cç][aã]o|ligar|chamada/i);
    // Não comenta a preguiça: a pessoa disse do que gosta, a tela só abre a porta.
    expect(OFERTA).not.toMatch(/pregui/i);
  });

  it('o convite sorteado continua igual', () => {
    expect(CHAT).toContain('Seria melhor aprender como falar né?');
  });
});
