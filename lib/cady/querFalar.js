/* "EU QUERIA FALAR" — A PESSOA DIZENDO, NO ESCREVER, QUE PREFERIA O FALAR.

   O Escrever é o plano grátis e o Falar é o pago. O convite sorteado a cada 5
   a 8 mensagens (CONVITE_FALAR, em TextChatClient) é um empurrão às cegas: ele
   não sabe se a pessoa está com vontade de falar. Quando ela DIZ — "poxa, mas eu
   queria falar", "dá preguiça de escrever, era mais fácil falar", "I like,
   talking better" —, é o melhor momento de oferta que existe, e ele passa em uma
   mensagem. Este módulo reconhece essa frase; quem mostra a oferta é o cliente.

   POR QUE NÃO É O MODELO QUE RECONHECE. A rota do chat não é deste ajuste, e
   pedir no prompt "se ela disser que prefere falar, ofereça" faria a Cady falar
   de plano e de botão — coisa que ela não sabe e não deve saber. Aqui o teste é
   determinístico, custa zero, roda antes da resposta chegar e cabe numa suíte de
   testes com a lista de frases do lado.

   FALSO POSITIVO É PIOR QUE FALSO NEGATIVO. Perder um "queria falar" custa uma
   oferta — o convite sorteado aparece daqui a pouco de qualquer jeito. Oferecer
   o microfone pra quem escreveu "quero falar sobre meu trabalho" é a tela
   mostrando que não leu, bem no meio do assunto da pessoa. Por isso tudo aqui é
   feito pra deixar passar na dúvida.

   COMO: A ORAÇÃO INTEIRA PRECISA SER O PEDIDO. Procurar "falar" dentro da frase
   não serve — "falar em público me dá medo", "meu chefe fala muito" e "quero
   falar sobre meu trabalho" contêm tudo o que um pedido contém. O que separa um
   do outro é o que vem EM VOLTA do verbo. Então cada oração (o texto é cortado em
   . ! ? ; : e quebra de linha) só casa se for, de ponta a ponta:

     abertura*   núcleo   cauda*   (e opcionalmente mais núcleos encadeados)

   - ABERTURA: só muleta de conversa ("poxa", "mas", "eu", "tipo", "honestly").
     "Poxa mas eu | queria falar" casa; "meu filho | queria falar" não, porque
     "meu filho" não é muleta — o sujeito é outro.
   - NÚCLEO: a intenção em si ("queria falar", "preguiça de escrever", "I'd
     rather talk"). Cada família tem o seu.
   - CAUDA: só o que mantém o sentido de "por voz" ("agora", "por voz", "em vez
     de escrever", "than typing"). "queria falar | agora" casa; "queria falar |
     sobre meu trabalho" não, porque "sobre meu trabalho" é assunto, e quem tem
     assunto quer falar DE alguma coisa, não POR voz.
   - ENCADEAR: "dá preguiça de escrever, era mais fácil falar" são dois núcleos
     seguidos. A vírgula some na normalização (o "I like, talking better" do dono
     tem uma vírgula no meio do verbo, e cortar ali quebraria a frase), então a
     oração vira uma só e os dois núcleos precisam poder vir em sequência.

   O preço disso é deixar passar frase comprida e frase torta ("queria falar mas
   tenho que escrever né"). É o preço certo: a frase curta e direta é a comum, e
   a comprida quase sempre tem um assunto dentro.

   Sem `\b` e sem lookbehind: depois de normalizar, a oração é só palavras em
   minúsculo separadas por UM espaço, e cada pedaço da gramática já carrega o
   seu espaço. Fica legível e não depende de recurso de regex que varia entre
   navegadores. */

/* ---- montagem ---------------------------------------------------------- */

/* Alternância sem repetição. Repetição aqui não é só feio: dentro de um laço
   `(?: x)*`, a mesma palavra casando por dois caminhos dobra o trabalho do
   motor de regex a cada repetição — dez "mesmo" seguidos viram mil caminhos.
   Pelo mesmo motivo, nenhuma alternativa de um laço é a soma de outras duas
   ("tudo" + "isso" já cobre "tudo isso"; as duas juntas seriam dois caminhos). */
const ou = (...xs) => `(?:${[...new Set(xs.flat())].join('|')})`;
const talvez = (x) => `(?:${x} )?`;   // palavra(s) opcional(is), com o espaço
const varias = (x) => `(?:${x} )*`;

/* ---- vocabulário PT ---------------------------------------------------- */

// Depois da normalização ("falr"/"flar" já viraram "falar"). "fala" sozinho NÃO
// entra aqui: "Fala, Cady!" é oi, e "meu chefe fala muito" é terceira pessoa.
// Ele só vale colado em "prefiro"/"queria", onde é o erro de digitação do dono.
const FALAR = 'falar';
const ESCREVER = ou('escrever', 'escreve', 'escrver', 'escever', 'escrevr', 'screver', 'escrevendo',
  'digitar', 'digita', 'digitr', 'digitando', 'teclar', 'teclando');
const PREGUICA = 'preg(?:u|ui|i)[cs]+a';   // preguica, preguisa, pregica, preguca
const AUDIO = ou('audio', 'mensagem de voz', 'mensagens de voz', 'msg de voz', 'nota de voz');

// Pelo meio, e não pelo assunto. Tudo aqui diz COMO falar, nunca SOBRE O QUÊ.
// "ao vivo" e "falando" ficam fora DESTA lista de propósito — "prefiro ao vivo"
// responde a "você vê o jogo pela TV?" — e entram à mão só onde a frase já diz
// falar ("queria falar ao vivo", "prefiro falando").
const POR_VOZ = ou('por voz', 'por audio', 'em voz alta', 'pelo microfone', 'no microfone',
  'usando a voz', 'com a voz', 'com minha voz', 'com a minha voz', 'pelo audio',
  'por mensagem de voz');

// A comparação com escrever. "prefiro falar | do que escrever".
const EM_VEZ_DE_ESCREVER = ou(
  `${ou('em vez de', 'ao inves de', 'inves de', 'no lugar de', 'sem', 'do que', 'que', 'a',
    'e nao', 'nao', 'pra nao')} ${talvez(ou('ficar', 'ter que', 'ter de'))}${ESCREVER}`,
  'em vez disso', 'ao inves disso',
);

// Trocar pro modo voz, dito com o nome das coisas do app.
const USAR_A_VOZ = `${ou('usar', 'testar', 'experimentar', 'abrir', 'ativar', 'ligar', 'ir pro',
  'ir pra', 'mudar pro', 'mudar pra', 'trocar pro', 'trocar pra', 'passar pro', 'passar pra',
  'voltar pro', 'voltar pra')} ${ou('o falar', 'a voz', 'o microfone', 'microfone', 'o audio',
  'o modo de voz', 'o modo voz', 'modo de voz', 'modo voz', 'o modo falar', 'voz')}`;

const MAIS_FACIL = `${talvez(ou('bem', 'muito', 'mil vezes', 'tao'))}${ou('mais facil', 'melhor',
  'mais rapido', 'mais pratico', 'mais legal', 'mais gostoso', 'mais de boa', 'mais tranquilo',
  'mais simples', 'mais natural')}`;

/* ---- vocabulário EN ---------------------------------------------------- */

const TALK = 'talk(?:ing|in)?';
const SPEAK = 'sp(?:ea|ee|e)k(?:ing|in)?';          // speak, speek, spek (+ -ing)
const FALA_EN = ou(TALK, SPEAK);
/* Sem "text"/"texting": em inglês é mandar mensagem no celular, não digitar
   aqui. "I hate texting" e "texting is boring" são resposta à pergunta de
   conversação mais comum que existe ("texting or calling?"), e disparavam a
   oferta paga. */
const WRITE = ou('write', 'writing', 'writin', 'writting', 'writeing', 'type', 'typing', 'typin');
const AUDIO_EN = ou('audio', 'audios', 'audio message', 'audio messages', 'voice message',
  'voice messages', 'voice note', 'voice notes', 'voice memo', 'voice memos');
const BY_VOICE = ou('by voice', 'with voice', 'with my voice', 'using my voice', 'using voice',
  'out loud', 'aloud', 'over voice', 'via voice', 'through voice', 'by audio', 'via audio',
  'with the mic', 'using the mic', 'with the microphone', 'using the microphone', 'in voice mode');
const INSTEAD_OF_WRITING = ou(
  `${ou('instead of', 'rather than', 'than', 'than i', 'than to', 'not', 'and not', 'over', 'to',
    'without')} ${WRITE}`,
  'instead of this',
);
const INTENSO_EN = ou('much', 'way', 'a lot', 'so much', 'far', 'really', 'so', 'definitely');
const VOICE_FEATURE = ou('voice mode', 'voice chat', 'voice conversation', 'voice option',
  'voice feature', 'voice version', 'voice practice', 'audio mode', 'speaking mode', 'talking mode');

/* ---- abertura e cauda comuns ------------------------------------------- */

/* Muleta de conversa, que pode vir antes do pedido sem mudar quem pede nem o
   quê. NÃO tem "não" (vira "não prefiro falar"), nem artigo, nem nome — "meu
   filho", "ela", "minha mãe" trocam o sujeito, e o pedido deixa de ser dela. */
const ABERTURA_PALAVRAS = [
  // PT
  'poxa', 'po', 'pow', 'poh', 'ah', 'ai', 'aff', 'af', 'afe', 'putz', 'nossa', 'cara', 'mano',
  'tipo', 'olha', 'bom', 'entao', 'eu', 'mas', 'e', 'que', 'ne', 'so', 'sabe', 'sim', 'ta',
  'beleza', 'blz', 'ok', 'okay', 'oi', 'ola', 'ei', 'gente', 'eita', 'vish', 'ixi', 'uai',
  'oxe', 'bah', 'hm+', 'hum', 'na verdade', 'na real', 'de verdade', 'sinceramente',
  'honestamente', 'confesso que', 'acho que', 'sera que', 'sei la', 'por favor', 'alias',
  'cady', 'professora',
  // EN
  'oh', 'well', 'honestly', 'actually', 'tbh', 'ngl', 'but', 'and', 'hey', 'hi', 'hello', 'ugh',
  'man', 'dude', 'like', 'yeah', 'yes', 'yep', 'nah', 'no', 'sorry', 'please', 'really',
  'just', 'also', 'omg', 'wait', 'btw', 'anyway', 'anyways', 'i mean', 'i think', 'i guess',
  'to be honest', 'you know',
];
const ABERTURA = ou(ABERTURA_PALAVRAS);

const CAUDA_COMUM = [
  'agora', 'ja', 'entao', 'tambem', 'mesmo', 'ne', 'sabe', 'viu', 'ai', 'hein', 'por favor',
  'cady', 'sinceramente', 'honestamente', 'de verdade', 'com certeza', 'uai', '100',
  'please', 'now', 'rn', 'instead', 'actually', 'honestly', 'tbh', 'ngl', 'really', 'though',
  'tho', 'too', 'also', 'ok', 'okay', 'for real', 'if possible', 'if i can', 'if we can',
  'if thats ok', 'if thats okay',
];

/* ---- as famílias ------------------------------------------------------- */

const FAMILIAS = [
  /* QUERER (PT). "queria falar", "quero falar por voz", "quero conversar por voz".
     "conversar" sozinho NÃO: "quero conversar" é o jeito mais comum de começar
     a conversa escrita, e não diz nada sobre voz. "falar", sim — no Escrever ele
     é o contrário de escrever. "com você" também fica fora da cauda: "queria
     falar com você" costuma ser a primeira metade de "…sobre uma coisa". */
  {
    nucleo: `${ou('quero', 'queria', 'gostaria de', 'gostaria', 'preferia', 'preferiria')} `
      + `${talvez(ou('muito', 'tanto', 'era'))}`
      + `${ou(FALAR, 'fala', `conversar ${POR_VOZ}`, `praticar ${POR_VOZ}`, `treinar ${POR_VOZ}`,
        `mandar ${talvez('um')}${AUDIO}`, USAR_A_VOZ)}`,
    /* "com você" só com o meio dito logo depois: "queria falar com você por
       voz" é pedido; "queria falar com você" sozinho continua sendo a metade
       de "…sobre uma coisa". */
    cauda: [POR_VOZ, EM_VEZ_DE_ESCREVER, 'ao vivo', `${ou('com voce', 'contigo')} ${ou(POR_VOZ, EM_VEZ_DE_ESCREVER)}`],
  },

  /* PEDIR (PT). "posso falar?", "tem como falar por voz", "dá pra mandar áudio?".
     NÃO tem "pode falar": é "vai em frente, diz" — a Cady ouviria isso toda hora.
     Nem "consigo falar" solto: sem o ponto de interrogação (que a normalização
     tira) ele é "agora eu consigo falar!", comemoração, não pedido. Com "como"
     na frente volta a ser pergunta.
     Aqui "com você" pode: quem pede licença pra falar com a Cady, dentro da
     conversa escrita com ela, está pedindo outro meio.
     "te" NÃO, a não ser com o meio dito: "posso te falar?" é "posso te
     contar?", a abertura de um desabafo ("Posso te falar? Hoje foi um dia
     horrível"). "posso te falar por áudio?" continua valendo. */
  {
    nucleo: `${ou('posso', 'podemos', 'da pra', 'tem como', 'e possivel', 'seria possivel', 'rola',
      `como ${talvez(ou('e que', 'que'))}${talvez('eu')}${ou('faco pra', 'faz pra', 'consigo')}`)} `
      + `${talvez(ou('eu', 'a gente'))}`
      + `${ou(FALAR, `te ${FALAR} ${ou(POR_VOZ, EM_VEZ_DE_ESCREVER)}`, `conversar ${POR_VOZ}`,
        `praticar ${POR_VOZ}`, `${ou('mandar', 'enviar', 'gravar')} ${talvez('um')}${AUDIO}`, USAR_A_VOZ)}`,
    cauda: ['com voce', 'contigo', 'com a cady', POR_VOZ, EM_VEZ_DE_ESCREVER],
  },

  /* PODE SER POR ÁUDIO? (PT). O meio dito como proposta: "pode ser por
     áudio?", "podia ser por voz". Sem o POR_VOZ não é nada ("pode ser"). */
  {
    nucleo: `${ou('pode ser', 'podia ser', 'poderia ser', 'da pra ser', 'tem como ser')} ${POR_VOZ}`,
    cauda: [],
  },

  /* PREFERIR (PT). "prefiro falar", "prefiro fala" (o erro do dono), "gosto mais
     de falar". "prefiro voz" e "prefiro áudio" sozinhos ficam de fora: são
     resposta natural pra "você prefere piano ou voz?", "ler ou audiobook?". */
  {
    nucleo: ou(
      `${ou('prefiro', 'preferiria', 'preferia', 'prefiria')} ${talvez(ou('muito', 'bem',
        'mil vezes', 'mais'))}${ou(FALAR, 'fala', 'falando', POR_VOZ, `mandar ${talvez('um')}${AUDIO}`,
        `conversar ${POR_VOZ}`, 'o falar')}`,
      `${ou('gosto', 'curto')} ${talvez(ou('muito', 'bem'))}mais de ${ou(FALAR, 'fala')}`,
    ),
    cauda: [EM_VEZ_DE_ESCREVER, POR_VOZ, 'pra mim', 'mil vezes',
      `${ou('com voce', 'contigo')} ${ou(POR_VOZ, EM_VEZ_DE_ESCREVER)}`],
  },

  /* MAIS FÁCIL (PT). "era mais fácil falar", "falar é mais fácil", "seria melhor
     por áudio". Na ordem invertida o verbo é OBRIGATÓRIO: sem ele, "falar
     melhor" é a meta de quem estuda ("quero aprender a falar melhor"), não uma
     preferência. E "mais fácil falar do que fazer" não casa, porque "do que
     fazer" não é cauda — é o ditado, não um pedido. */
  {
    nucleo: ou(
      `${talvez(ou('e', 'era', 'seria', 'fica', 'ficaria', 'ia ser', 'vai ser', 'acho que e',
        'acho que seria', 'pra mim e', 'pra mim seria'))}${MAIS_FACIL} `
      + `${talvez(ou('eu', 'so', 'pra mim'))}${ou(FALAR, 'falando', POR_VOZ, `mandar ${talvez('um')}${AUDIO}`)}`,
      `${ou(FALAR, 'falando', POR_VOZ)} ${ou('e', 'era', 'seria', 'fica', 'ficaria', 'ia ser',
        'vai ser', 'me parece')} ${MAIS_FACIL}`,
    ),
    cauda: ['pra mim', EM_VEZ_DE_ESCREVER, 'ainda'],
  },

  /* FALO MELHOR DO QUE ESCREVO (PT). "falo melhor" sozinho não: é "falo melhor
     inglês do que espanhol" pela metade. */
  {
    nucleo: ou(
      `${ou('falo', 'me expresso', 'me viro', 'me comunico', 'converso')} `
      + `${talvez(ou('bem', 'muito', 'mil vezes'))}melhor `
      + `${ou(`${talvez('falando')}${ou('do que', 'que')} ${ou('escrevo', 'digito', ESCREVER)}`,
        'falando', POR_VOZ)}`,
      `sou ${talvez(ou('bem', 'muito', 'mil vezes'))}melhor ${ou('falando', 'na fala')}`,
    ),
    cauda: [EM_VEZ_DE_ESCREVER, 'pra mim'],
  },

  /* CANSOU DE ESCREVER (PT). "preguiça de escrever", "cansei de digitar",
     "não gosto de escrever", "escrever é chato". A cauda aceita "aqui", "no
     celular", "hoje" — continua sendo sobre ESTA escrita. "relatório",
     "redação", "e-mail" não: aí é o trabalho ou a escola, e a oferta seria
     responder a um desabafo com propaganda. "em inglês" também não: "não quero
     escrever em inglês" é pedido de IDIOMA (quer escrever em português), e a
     Cady entende português — quem responde a isso é ela, não um botão de voz.
     "bora falar" e "vamos falar" são cauda só aqui, porque depois de reclamar
     de escrever eles só podem ser voz.
     A oferta, quando vem, não comenta a preguiça: só oferece. */
  {
    nucleo: ou(
      `${varias(ou('que', 'da', 'me', 'bate', 'bateu', 'to', 'com', 'tenho', 'muita', 'uma',
        'muito', 'maior', 'sinto', 'deu', 'ta', 'dando'))}${PREGUICA} `
      + `${talvez(ou('de', 'd', 'pra', 'em'))}${talvez(ou('ficar', 'ter que'))}${ESCREVER}`,
      `${varias(ou('to', 'ja', 'fiquei', 'meio', 'muito', 'ta'))}${ou('cansei', 'cansado', 'cansada',
        'canso', 'cansa', 'cansou', 'cansativo', 'cansando')} `
      + `${talvez(ou('de', 'd', 'pra'))}${talvez(ou('ficar', 'ter que'))}${ESCREVER}`,
      `${ESCREVER} ${talvez(ou('e', 'ta', 'fica', 'me', 'da', 'ficou'))}`
      + `${varias(ou('muito', 'tao', 'bem', 'meio', 'um', 'super', 'mega'))}`
      + `${ou('chato', 'chatinho', 'cansativo', 'saco', 'trabalhoso', 'lento', 'demorado',
        'entediante', 'cansa', PREGUICA)}`,
      `${ou('odeio', 'detesto', 'nao aguento', 'nao suporto', 'nem aguento', 'nao gosto',
        'nem gosto', 'nao curto', 'nao sou fa', 'nao to afim', 'nao to a fim', 'nem to afim',
        'nao tenho paciencia', 'nao tenho saco', 'nao quero', 'nao queria', 'nem quero')} `
      + `${talvez(ou('muito', 'mais', 'nada', 'tanto'))}${talvez(ou('de', 'd', 'pra'))}`
      + `${talvez(ou('ficar', 'ter que'))}${ESCREVER}`,
    ),
    cauda: ['aqui', 'tudo', 'isso','tanto', 'muito', 'assim', 'hoje', 'demais',
      'mais', 'no celular', 'pelo celular', 'no teclado', 'no telefone', 'toda hora',
      'o tempo todo', 'sempre', 'pra caramba',
      `${ou('bora', 'vamos', 'vem', 'partiu', 'deixa eu', 'me deixa')} ${talvez('so')}`
        + `${ou(FALAR, `mandar ${talvez('um')}${AUDIO}`)}`],
  },

  /* BORA POR VOZ (PT). "vamos falar!" sozinho é "vamos conversar" — abertura
     genérica. Só vale com o meio dito: "bora falar por voz", "vamos praticar
     falando", "vamos falar em vez de escrever". */
  {
    nucleo: `${ou('bora', 'vamos', 'vambora', 'simbora', 'partiu', 'deixa eu', 'me deixa')} `
      + `${talvez('so')}${ou(FALAR, 'conversar', 'praticar', 'treinar')} `
      + `${ou(POR_VOZ, EM_VEZ_DE_ESCREVER, 'falando')}`,
    cauda: [POR_VOZ, EM_VEZ_DE_ESCREVER],
  },

  /* MANDA ÁUDIO (PT). "manda áudio", "posso te mandar um áudio?". Sujeito é
     sempre quem escreve ou a Cady — "minha mãe manda áudio o dia todo" para na
     abertura, porque "minha mãe" não é muleta.
     Sem "mando": primeira pessoa do presente é HÁBITO ("eu mando áudio, minha
     mãe não lê mensagem" responde a "como você fala com sua mãe?"). O pedido
     vem no infinitivo ou no imperativo: "posso mandar", "vou mandar",
     "manda". */
  {
    nucleo: `${talvez(ou('posso', 'pode', 'podemos', 'da pra', 'tem como', 'consigo',
      'voce pode', 'rola', 'quero', 'queria', 'vou'))}`
      + `${varias(ou('te', 'me', 'pra voce', 'um'))}`
      + `${ou('manda', 'mande', 'mandar', 'envia', 'envie', 'enviar', 'grava', 'grave',
        'gravar')} ${varias(ou('um', 'uns', 'o', 'os', 'te', 'pra voce'))}${AUDIO}`,
    cauda: ['pra voce', 'pra mim', EM_VEZ_DE_ESCREVER],
  },

  /* A CADY TEM VOZ? (PT). "você me ouve?", "você tem voz?", "vc aceita áudio?".
     "você fala?" sozinho NÃO: é também "você fala" = "diz você", resposta
     comum a "sobre o que você quer conversar?". */
  {
    nucleo: `voce ${talvez(ou('tambem', 'consegue', 'sabe'))}`
      + `${ou('tem voz', 'me ouve', 'me escuta', 'fala por voz', 'fala em voz alta',
        'conversa por voz', `${ou('ouve', 'escuta', 'entende', 'aceita', 'responde')} ${AUDIO}`,
        `responde ${POR_VOZ}`, 'consegue falar', 'sabe falar')}`,
    cauda: ['comigo', POR_VOZ],
  },

  /* O MODO VOZ PELO NOME (PT). "tem modo de voz?", "cadê o modo voz",
     "conversa por voz". */
  {
    nucleo: `${talvez(ou('tem', 'existe', 'cade', 'onde fica', 'onde ta', 'onde esta',
      'como ativa', 'como ativo', 'como abre', 'como abro', 'como uso', 'como usa', 'quero',
      'queria', 'posso usar', 'da pra usar', 'quero usar', 'queria usar', 'quero testar',
      'queria testar', 'vou testar', 'vou usar'))}`
      + `${talvez(ou('o', 'um', 'a'))}`
      + `${ou('modo de voz', 'modo voz', 'modo audio', 'modo de audio', 'modo falar',
        'chat de voz', 'conversa por voz', 'conversa de voz', 'conversa falada', 'opcao de voz',
        'opcao de audio', 'versao de voz', 'versao com voz')}`,
    cauda: [],
  },

  /* WANT / PREFER / RATHER (EN). "I want to speak", "I prefer talking", "I'd
     rather talk". "talk" com want precisa do meio dito ("I want to talk by
     voice"): "I (just) want to talk" é "quero conversar", e a pessoa já está
     conversando. "speak" não precisa — é o verbo de falar em voz, e o "about my
     trip" / "English fluently" que tornaria o pedido outra coisa para na cauda.
     "prefer" e "rather" também não precisam: preferir já é comparar. */
  {
    nucleo: ou(
      `i ${varias(ou('really', 'just', 'kinda', 'kind of', 'actually', 'honestly', 'do', 'still',
        'totally', 'would really'))}${ou('want', 'wanted', 'would like', 'would love')} `
      + `${talvez('to')}${ou(SPEAK, `${TALK} ${ou(BY_VOICE, INSTEAD_OF_WRITING, 'instead')}`,
        `use ${talvez('my')}voice`, `use ${talvez('the')}${ou('mic', 'microphone', 'voice mode', 'voice chat')}`,
        `try ${talvez('the')}${ou(VOICE_FEATURE, 'voice')}`, `practice ${ou('speaking', 'talking')}`,
        `switch to ${talvez('the')}${ou('voice', VOICE_FEATURE, 'speaking', 'talking')}`)}`,
      `i ${varias(ou('really', 'just', 'kinda', 'actually', 'honestly', 'do', 'much', 'still',
        'would much', 'would really'))}${ou('prefer', 'would prefer', 'would rather', 'rather')} `
      + `${talvez('to')}${ou(FALA_EN, `use ${talvez('my')}voice`, BY_VOICE)}`,
    ),
    cauda: [BY_VOICE, INSTEAD_OF_WRITING],
  },

  /* LIKE BETTER (EN). "I like, talking better" é a frase do dono, com a vírgula
     que a normalização engole. "better"/"more" é obrigatório: "I like talking"
     sozinho é traço de personalidade ("I like talking to my friends"). */
  {
    nucleo: `i ${varias(ou('really', 'just', 'kinda', 'actually', 'honestly', 'do', 'much',
      'still'))}${ou('like', 'love', 'enjoy')} `
      + `${ou(`${talvez(INTENSO_EN)}${ou('more', 'better')} ${talvez('to')}${FALA_EN}`,
        `${talvez('to')}${FALA_EN} ${talvez(INTENSO_EN)}${ou('more', 'better')}`)}`,
    cauda: [INSTEAD_OF_WRITING, BY_VOICE],
  },

  /* EASIER (EN). "talking is easier", "it's easier to speak", "I'm better at
     speaking". "I speak better" sozinho não: é a metade de "…than my brother". */
  {
    nucleo: ou(
      `${ou(FALA_EN, 'voice', 'audio')} ${ou('is', 'its', 'would be', 'will be', 'seems', 'feels',
        'sounds', 'is just', 'would just be')} ${talvez(INTENSO_EN)}`
      + `${ou('easier', 'better', 'faster', 'more fun', 'funnier', 'more natural',
        'more comfortable', 'simpler', 'quicker', 'nicer')}`,
      // "is" sem o "it" é o erro típico de brasileiro ("is easier to speak").
      `${talvez(ou('its', 'it is', 'is', 'it would be', 'it will be', 'would be', 'itd be', 'be'))}`
      + `${talvez(INTENSO_EN)}${ou('easier', 'better', 'faster', 'more natural', 'simpler', 'quicker')} `
      + `${talvez('for me')}to ${FALA_EN}`,
      `i am ${talvez(INTENSO_EN)}better ${ou('at', 'in', 'when')} ${ou('speaking', 'talking',
        'i speak', 'i talk')}`,
      `i ${ou('speak', 'talk')} ${talvez(INTENSO_EN)}better than i ${ou('write', 'type', 'text')}`,
    ),
    cauda: ['for me', INSTEAD_OF_WRITING, 'you know', 'right'],
  },

  /* TIRED OF TYPING (EN). "tired of typing", "I hate writing", "typing is
     boring". "writing is hard" não: é dificuldade, não preferência — e a
     resposta certa pra quem acha difícil é a Cady, não um botão. */
  {
    nucleo: ou(
      `${talvez(ou('i am', 'i'))}${varias(ou('so', 'really', 'very', 'kinda', 'kind of', 'a bit',
        'a little', 'too', 'getting', 'already', 'just', 'pretty', 'super'))}`
      + `${ou('tired', 'lazy', 'bored', 'sick', 'exhausted', 'done')} `
      + `${ou('of', 'to', 'for', 'with', 'from')} ${WRITE}`,
      `${talvez('i')}${varias(ou('really', 'just', 'kinda', 'honestly', 'actually'))}`
      + `${ou(`${ou('dont', 'do not')} ${talvez('really')}${ou('like', 'enjoy', 'love', 'want',
        'feel like')}`, 'hate', 'cant stand', 'cannot stand', 'can not stand', 'dislike')} `
      + `${talvez('to')}${WRITE}`,
      `${WRITE} ${ou('is', 'its', 'gets', 'feels', 'is getting', 'can be')} `
      + `${varias(ou('so', 'really', 'too', 'very', 'kinda', 'kind of', 'a bit', 'a little', 'super',
        'pretty', 'such'))}${ou('boring', 'annoying', 'tiring', 'exhausting', 'slow', 'a pain',
        'tedious', 'a drag')}`,
    ),
    cauda: ['here', 'so much', 'anymore', 'all this', 'this much', 'all the time',
      'today', 'on my phone', 'on the phone', 'on the keyboard',
      `${ou('lets', 'let us', 'can we')} ${talvez('just')}${FALA_EN}`],
  },

  /* PERMISSION (EN). "can I talk", "can we talk instead", "is it possible to
     speak". "can we talk?" sozinho NÃO: em inglês é "precisamos conversar" — só
     vale com o "instead"/"by voice" dito. "can I speak Portuguese?" para na
     cauda, e é bom que pare: é pedido de idioma, não de voz. */
  {
    nucleo: ou(
      `${ou('can i', 'could i', 'may i', 'is it possible to', 'is possible to', 'its possible to', 'is there a way to', 'how can i',
        'how do i', 'how could i', 'how to')} ${talvez(ou('just', 'also'))}`
      + `${ou(FALA_EN, `use ${talvez(ou('my', 'the'))}${ou('voice', 'mic', 'microphone', 'voice mode',
        'voice chat')}`, `switch to ${talvez('the')}${ou('voice', VOICE_FEATURE, 'speaking', 'talking')}`,
        `do ${talvez(ou('it', 'this'))}${BY_VOICE}`, `try ${talvez('the')}${ou(VOICE_FEATURE, 'voice')}`)}`,
      `${ou('can', 'could')} we ${talvez(ou('just', 'also'))}`
      + `${ou(SPEAK, `use ${talvez('the')}${ou('voice', 'mic', 'microphone', 'voice mode', 'voice chat')}`,
        `switch to ${talvez('the')}${ou('voice', VOICE_FEATURE, 'speaking', 'talking')}`,
        `do ${talvez(ou('it', 'this'))}${BY_VOICE}`, `try ${talvez('the')}${ou(VOICE_FEATURE, 'voice')}`,
        `${TALK} ${ou(BY_VOICE, INSTEAD_OF_WRITING, 'instead')}`)}`,
      `${ou('can', 'could', 'do')} you ${ou('talk', 'speak', 'hear me', 'hear my voice',
        'understand audio', 'listen to audio', 'hear audio', 'do voice', 'use voice',
        'talk out loud', 'speak out loud')}`,
    ),
    cauda: ['to you', 'with you', BY_VOICE, INSTEAD_OF_WRITING],
  },

  /* LETS TALK BY VOICE (EN). "let's talk" sozinho é "vamos conversar" — a
     pessoa já está conversando. Só vale com o meio ou a troca dita: "lets
     talk by voice", "let's just talk instead". */
  {
    nucleo: `${ou('lets', 'let us')} ${talvez('just')}${FALA_EN} ${ou(BY_VOICE, INSTEAD_OF_WRITING, 'instead')}`,
    cauda: [BY_VOICE, INSTEAD_OF_WRITING],
  },

  /* SEND AUDIO (EN). "can I send you a voice note?", "send audio". */
  {
    nucleo: `${talvez(ou('can i', 'could i', 'can we', 'may i', 'let me', 'i will', 'i can',
      'i want to', 'i would like to', 'should i', 'how do i', 'how can i'))}`
      + `send ${talvez(ou('you', 'me'))}${talvez(ou('an', 'a', 'some'))}${AUDIO_EN}`,
    cauda: [INSTEAD_OF_WRITING],
  },

  /* VOICE (EN). "voice mode", "can we use voice?", "do you have a voice?".
     "voice" SOZINHO não: é a resposta mais comum a "como se diz 'voz'?", e ali
     a oferta paga apareceria do nada. Quem quer o Falar diz o pedido inteiro.
     "the voice" / "my voice" / "her voice" não: artigo ou dono antes
     de "voice" só vale depois de um verbo de pedido ("do you have a voice"),
     senão "the voice" é o programa de TV e "my voice" é a garganta.
     "out loud", "aloud", "by voice" SOZINHOS não: são a resposta a "como se
     diz 'em voz alta'?". Eles só valem como cauda de um pedido ("I want to
     talk by voice"). */
  {
    nucleo: ou(
      `${talvez(ou('the', 'a'))}${VOICE_FEATURE}`,
      `${ou('do you have', 'is there', 'theres', 'there is', 'you have', 'have you got',
        'where is', 'wheres', 'how do i', 'how can i', 'how to', 'can i', 'can we', 'could we',
        'could i', 'lets', 'let us', 'i want to', 'i would like to', 'i prefer', 'i would prefer',
        'i would rather')} `
      + `${talvez(ou('use', 'do', 'try', 'switch to', 'go to', 'turn on', 'open', 'start', 'enable',
        'get', 'have'))}${talvez(ou('the', 'a', 'an'))}${ou(VOICE_FEATURE, 'voice', 'audio')}`,
    ),
    /* Sem "mode"/"chat" na cauda: VOICE_FEATURE já tem "voice mode" e "voice
       chat", e as duas juntas dariam dois caminhos pra cada "voice chat" — dez
       seguidos, mil caminhos (é o laço do comentário lá em cima). */
    cauda: [],
  },
];

const FAMILIA = ou(FAMILIAS.map(({ nucleo, cauda }) => (
  `${nucleo}(?: ${ou(...cauda, ...CAUDA_COMUM)})*`
)));

const PEDIDO = new RegExp(`^${varias(ABERTURA)}${FAMILIA}(?: ${varias(ABERTURA)}${FAMILIA})*$`);

/* ---- normalização ------------------------------------------------------ */

/* Abreviação e erro de digitação que mudam a PALAVRA. Aplicado por palavra
   inteira, nunca por pedaço — "q" vira "que", mas o "q" de "quero" não. */
const TROCAS = {
  vc: 'voce', vce: 'voce', ce: 'voce', oce: 'voce', voc: 'voce',
  q: 'que', qe: 'que',
  n: 'nao', naum: 'nao', nn: 'nao',
  tb: 'tambem', tbm: 'tambem',
  mt: 'muito', mto: 'muito', mtu: 'muito', mo: 'muito',
  para: 'pra',
  tou: 'to', estou: 'to',
  eh: 'e',
  msm: 'mesmo',
  pf: 'por favor', pfv: 'por favor', pfvr: 'por favor', porfavor: 'por favor',
  pls: 'please', plz: 'please', plis: 'please', pliz: 'please', pleas: 'please',
  u: 'you',
  wanna: 'want to',
  im: 'i am',
  id: 'i would',
  qria: 'queria', keria: 'queria', qeria: 'queria', quria: 'queria',
  qro: 'quero', kero: 'quero', qero: 'quero',
  prefero: 'prefiro', prifiro: 'prefiro', perfiro: 'prefiro', prefirio: 'prefiro',
  falr: 'falar', flar: 'falar',
  facl: 'facil', faci: 'facil',
  audios: 'audio', audiozinho: 'audio', audinho: 'audio',
  doq: 'do que', dq: 'do que',
};

// Risada não diz nada e aparece em qualquer lugar: sai antes de tudo. "he" e
// "hi" sozinhos ficam (são palavra em inglês); só a repetição é risada.
const RISADA = /^(?:k+|(?:ha)+h?|(?:ah){2,}|(?:he){2,}h?|(?:hi){2,}|(?:rs)+|lol|lmao|kk)$/;

// Oração com mais palavras que isto é relato, não pedido — e ainda poupa o
// motor de regex de frase gigante.
const MAX_PALAVRAS = 30;

/* Todas as orações, de qualquer tamanho. A decisão (querFalar) precisa ver a
   oração comprida também — ela é justamente o relato que mostra que o
   "queria falar" do fim era "queria falar DISSO". */
function oracoesDe(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return [];
  return texto
    .slice(0, 600)
    // O que está entre aspas é citação, não pedido: `Is "I'd rather talk"
    // correct?` pergunta sobre a frase — não a diz.
    .replace(/["“”«»„][^"“”«»„]*["“”«»„]/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')              // I'd -> id, don't -> dont, let's -> lets
    .split(/[.!?;:\n\r…]+/)
    .map((oracao) => oracao
      .replace(/[^a-z0-9]+/g, ' ')       // vírgula, emoji, hífen: tudo vira espaço
      .replace(/([a-z])\1{2,}/g, '$1')   // "poxaaa" -> "poxa", "kkkk" -> "k"
      .trim()
      .split(' ')
      .filter((p) => p && !RISADA.test(p))
      .map((p) => TROCAS[p] || p)
      .join(' '))
    .filter(Boolean);
}

const tamanho = (oracao) => oracao.split(' ').length;

/** O texto em orações normalizadas: minúsculas, sem acento, sem pontuação,
    abreviação expandida, letra esticada encolhida. Exportado pros testes. */
export function normalizar(texto) {
  return oracoesDe(texto).filter((oracao) => tamanho(oracao) <= MAX_PALAVRAS);
}

/* A MENSAGEM INTEIRA DECIDE, NÃO UM PEDAÇO DELA.

   Antes, bastava UMA oração casar (`.some`). Só que o corte em . ! ? é
   justamente onde a pessoa põe o assunto, e a oração seguinte era ignorada:
   "I hate writing essays" não disparava, mas "I hate writing. Essays are the
   worst." sim; "Posso falar? Eu discordo de você." virava oferta paga embaixo
   de uma discordância. A regra "a oração inteira precisa ser o pedido" valia
   pra oração e se perdia na mensagem.

   Agora cada oração é uma de três coisas:

   - MULETA: só palavra de conversa ("oi cady", "poxa", "sério", "please") ou
     só o meio ("por voz", "instead"). Não conta pra lado nenhum.
   - PEDIDO: casa com a gramática lá de cima.
   - ASSUNTO: todo o resto.

   E dispara só quando o PEDIDO é a última oração que não é muleta: o que vem
   depois do "posso falar?" é o que a pessoa queria dizer, e aí ela estava
   pedindo licença pra CONTAR, não pra falar por voz. Antes do pedido cabe no
   máximo um assunto curto ("Hoje foi corrido. Poxa, queria falar."), e nunca
   um que fale de meta de estudo: depois de "Meu objetivo é simples:" ou "Why
   am I learning?", o "quero falar" é o objetivo (falar inglês), não o meio.
   Um relato comprido antes também não: depois de um desabafo, "queria falar"
   é "queria falar disso". */
const MULETA_PALAVRAS = ou(ABERTURA_PALAVRAS, CAUDA_COMUM, 'serio');
const MULETA = new RegExp(`^${MULETA_PALAVRAS}(?: ${MULETA_PALAVRAS})*$`);
const SO_O_MEIO = new RegExp(`^${varias(ABERTURA)}${ou(POR_VOZ, BY_VOICE, EM_VEZ_DE_ESCREVER, INSTEAD_OF_WRITING, 'ao vivo')}$`);
const ASSUNTO_CURTO = 4;
const FALA_DE_META = /\b(objetivo|objetivos|meta|metas|sonho|motivo|razao|por que|porque|pq|aprender|aprendendo|estudar|estudando|fluente|fluencia|ingles|goal|goals|dream|reason|why|learn|learning|study|studying|fluent|fluency|english)\b/;

/* RESPOSTA À PERGUNTA DA CADY NÃO É PEDIDO.

   A Cady pergunta "X ou Y?" o tempo todo, e o modo iniciante oferece as
   respostas prontas pra digitar. Quando a pergunta dela já põe falar de um
   lado e escrever/ler/mensagem do outro ("Do you prefer texting or calling?",
   "What is easier for you, reading or speaking?"), "I prefer talking" e
   "Speaking is easier" são a RESPOSTA — digitadas, como ela pediu. A oferta
   ali seria a tela respondendo a uma pergunta que ninguém fez.

   Só vale com os DOIS lados, e só nas linhas de PERGUNTA dela (a que tem "?"
   e as opções a) b) c) embaixo). "What did you talk about?" sozinho não
   conta: a pessoa pode, sim, responder a isso com "poxa, queria falar". O
   resto da mensagem também não: a própria Cady, acolhendo um pedido de falar,
   diz "falar" e "escrever" na mesma frase — e a mensagem seguinte da pessoa
   ("sim, quero falar!") é o pedido de novo, não uma resposta. E
   "escreve"/"type" no imperativo ficam fora do lado da escrita porque são o
   empurrão com que ela fecha todo turno ("Agora escreve isso em inglês",
   "Type this: …") — com eles, a frase do dono ("dá preguiça de escrever, era
   mais fácil falar"), que é a reação natural a esse empurrão, nunca
   dispararia. */
const LADO_FALA = /\b(talk|talking|speak|speaking|call|calling|phone|voice|audio|falar|falando|conversar|ligar|ligacao|voz)\b/;
const LADO_ESCRITA = /\b(text|texting|texts|reading|message|messages|messaging|writing|typing|escrever|escrevendo|digitar|digitando|ler|lendo|mensagem|mensagens)\b/;
const LINHA_DE_PERGUNTA = /\?|^\s*[a-e]\)\s/i;

const osDoisLados = (t) => LADO_FALA.test(t) && LADO_ESCRITA.test(t);

function perguntaDeFalarOuEscrever(ultimaDaCady) {
  const perguntas = ultimaDaCady.split('\n').filter((l) => LINHA_DE_PERGUNTA.test(l));
  return osDoisLados(oracoesDe(perguntas.join('\n')).join(' '));
}

/** A pessoa disse que prefere falar a escrever? Na dúvida, não.
    `ultimaDaCady` é a última fala da Cady na tela, a que a pessoa está
    respondendo (opcional). */
export function querFalar(texto, ultimaDaCady = '') {
  const substantivas = oracoesDe(texto).filter((o) => tamanho(o) > MAX_PALAVRAS
    || !(MULETA.test(o) || SO_O_MEIO.test(o)));
  if (!substantivas.length) return false;
  const ehPedido = (o) => tamanho(o) <= MAX_PALAVRAS && PEDIDO.test(o);
  if (!ehPedido(substantivas[substantivas.length - 1])) return false;
  const assuntos = substantivas.slice(0, -1).filter((o) => !ehPedido(o));
  if (assuntos.length > 1) return false;
  /* O assunto de antes também não pode ser a pergunta "X ou Y" repetida pela
     própria pessoa ("Texting or calling? I prefer talking."): é o mesmo caso
     da resposta à Cady, só que com a pergunta digitada junto. */
  if (assuntos.length === 1 && (tamanho(assuntos[0]) > ASSUNTO_CURTO || FALA_DE_META.test(assuntos[0])
    || osDoisLados(assuntos[0]))) return false;
  if (typeof ultimaDaCady === 'string' && perguntaDeFalarOuEscrever(ultimaDaCady)) return false;
  return true;
}

/* O RESPIRO ENTRE UMA OFERTA E A PRÓXIMA.

   Quem disse "queria falar" costuma repetir do seu jeito na mensagem seguinte
   ("sério, dá preguiça de escrever"). Oferecer de novo a cada repetição é a
   tela insistindo, e insistência vende menos que silêncio. Três mensagens da
   pessoa entre uma oferta automática e a próxima. */
export const RESPIRO_ENTRE_OFERTAS = 3;

/** Pode oferecer de novo? `mensagem` e `ultimaOferta` contam as mensagens da
    pessoa (1, 2, 3…); `ultimaOferta` nula = nunca ofereceu. */
export function ofertaLiberada(mensagem, ultimaOferta) {
  if (ultimaOferta == null) return true;
  return mensagem - ultimaOferta >= RESPIRO_ENTRE_OFERTAS;
}
