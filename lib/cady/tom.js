/* O TOM DA CADY NO ESCREVER — qual Cady responde NESTE turno.

   Por que isto existe: o prompt da conversa aberta era ácido do começo ao fim,
   inclusive com quem acabou de chegar. Usuários novos desistiram depois de uma
   resposta irônica a uma frase de que estavam orgulhosos, e seis reclamaram do
   tom ("chata", "rude", "nervosa", "irritante"). O pedido do dono foi: nunca
   ironizar erro de iniciante; acidez só depois de a pessoa acertar algumas
   frases, ou quando ela ESCOLHER o estilo Ácida; um modo iniciante com
   português, frases prontas e perguntas com opções; e suavizar nas três
   primeiras conversas e pra quem está travando.

   Três níveis, resolvidos a cada turno:

     'iniciante'  explica em português, dá frases prontas pra completar,
                  pergunta com opções. Zero ironia.
     'suave'      calorosa e bem-humorada, zero sarcasmo sobre o inglês dele.
     'acida'      a Cady de sempre — com a regra de nunca ironizar erro de
                  iniciante escrita por cima.

   A regra de decisão (resolverTom, lá embaixo), na ordem em que ela é lida:

     1. escolheu 'iniciante'           -> 'iniciante', sempre.
     2. está travando (qualquer estilo) -> 'iniciante'. Quem trava precisa de
        andaime, não de ironia — e isso vale até pra quem escolheu Ácida.
     3. o estilo não pôde ser lido       -> 'suave'. Não dá pra saber se ele
        escolheu Iniciante, então a acidez não entra (ver resolverTom).
     4. escolheu 'acida'               -> 'acida'.
     5. 'equilibrada' (o padrão): nas 3 primeiras conversas, 'suave'. Depois
        delas, 'acida' só quando ele já acertou 3 frases em inglês NESTA
        conversa; antes disso, 'suave'.

   NA DÚVIDA, SUAVE. Toda leitura que alimenta isto pode falhar (a coluna do
   estilo pode não existir ainda, a contagem de conversas pode dar erro, o
   cliente pode mandar lixo). Errar pra suave custa uma Cady menos ácida por
   alguns turnos; errar pra ácida é repetir exatamente o que fez gente
   desistir. Por isso o "não sei" de cada entrada cai sempre no lado gentil.

   Este arquivo é PURO: não importa nada, não lê banco, não sabe de Next. As
   leituras do servidor ficam em tomServidor.js, que recebe o client do
   Supabase por parâmetro. Assim os testes (tests/tomCady.test.js) rodam a
   lógica de verdade, e o TextChatClient pode importar a mesma heurística que o
   servidor usa — a contagem de acertos do cliente e a leitura de "travando" do
   servidor não podem divergir sobre o que é "parecer inglês". */

export const ESTILOS_CADY = ['iniciante', 'equilibrada', 'acida'];
export const ESTILO_PADRAO = 'equilibrada';
export const NIVEIS_TOM = ['iniciante', 'suave', 'acida'];
export const TOM_NA_DUVIDA = 'suave';

/* Os três números do pedido, com nome, pra ninguém caçar um 3 solto. */
export const CONVERSAS_SUAVES = 3;
export const ACERTOS_PRA_ACIDEZ = 3;
export const TETO_SINAL = 50;

export function normalizarEstilo(valor) {
  return ESTILOS_CADY.includes(valor) ? valor : ESTILO_PADRAO;
}

/* OS SINAIS QUE O CLIENTE MANDA SÃO CONSELHO, NÃO ORDEM.

   Vêm do navegador, então chegam do jeito que alguém quiser mandar. O pior que
   um valor forjado faz é mudar o tom da Cady pra própria pessoa que forjou —
   ela poderia simplesmente escolher Ácida no Perfil —, mas lixo não pode virar
   NaN no meio da regra nem número gigante. Number, inteiro, entre 0 e 50;
   qualquer outra coisa vira 0, que é o lado gentil (0 acertos = sem acidez;
   0 correções seguidas = o resto da heurística decide).

   `conversaId` só passa se tiver cara de uuid: ele vai direto num filtro do
   Postgres, e um id malformado faria a contagem falhar (o que já cairia em
   suave, mas não há por que mandar a consulta sabendo que ela vai errar). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inteiroLimitado(valor) {
  const n = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(TETO_SINAL, Math.max(0, Math.floor(n)));
}

export function sanitizarSinaisTom(bruto) {
  const b = bruto && typeof bruto === 'object' ? bruto : {};
  return {
    acertos: inteiroLimitado(b.acertos),
    correcoesSeguidas: inteiroLimitado(b.correcoesSeguidas),
    conversaId: typeof b.conversaId === 'string' && UUID.test(b.conversaId) ? b.conversaId : null,
  };
}

/* "PARECE INGLÊS" — uma heurística de propósito simples.

   Não é detecção de idioma. É contar palavras de uma lista curta de cada
   língua e ver qual ganha. Serve pra duas perguntas pequenas: "esta mensagem é
   uma tentativa em inglês?" (pra contar acerto) e "ele voltou pro português?"
   (pra saber se está travando). Pra isso, lista curta basta, e o erro dela é
   previsível e barato.

   As palavras que existem nas DUAS línguas ficam fora das duas listas, senão
   cada uma empurraria pro lado errado metade das vezes:
     a, as, do, no, me, so, for — e principalmente "to", que em inglês é das
     palavras mais comuns e no português digitado é o "tô" sem acento
     ("to cansado").
   Palavra com acento ou cedilha que não está na lista inglesa conta como
   português — mas MEIO ponto, não um inteiro. Sozinha ela ainda decide
   ("comprei pão"), só que não vira o placar contra o inglês em volta: "At a
   café." é a resposta que o próprio prompt dá de exemplo no modo iniciante, e
   "I ate pão de queijo" é inglês certo com o nome da comida. Com peso inteiro,
   um "café" empatava com o "at" e a frase contava como travar.

   PALAVRA QUE NÃO ESTÁ EM LISTA NENHUMA NÃO CONTA PRA LADO NENHUM. As listas
   são curtas, e "Reading a book", "Cooking dinner", "Netflix, obviously." não
   têm nenhuma palavra delas. Isso não faz dessas frases português: por isso
   travar exige prova POSITIVA de português (voltouProPortugues, abaixo), e
   não só "não achei inglês".

   O apóstrofo curvo (’) vira reto antes de tudo. É o que o teclado do iPhone
   põe sozinho, e sem isso "I’m fine" não casaria com "i'm". */
const INGLES = new Set(`
  i i'm im i've i'll i'd you you're your yours he she it it's its we we're they they're
  my his her our their them him us the an is am are was were be been being
  have has had does did don't dont doesn't didn't can can't cant will won't would should could
  not and but or because if of in on at with from about into this that these those
  there here what when where why how who which what's that's there's
  just really very too also much many some any all every more most
  like love want need go goes went going gonna get got make made take took think know
  see saw feel felt say said tell told come came look watch watched play played
  work worked working study studied read write wrote eat ate drink sleep slept live lived
  today yesterday tomorrow morning night weekend week day time
  good fine great nice cool bad well better tired happy busy pretty
  yes yeah yep nope hello hi hey thanks thank please sorry sure
  friend friends family home job school house movie movies music food coffee
`.trim().split(/\s+/));

const PORTUGUES = new Set(`
  eu você voce vc não nao sim é e o os um uma uns umas de da dos das que pra para pro pros
  com em na nas nos num numa meu minha meus minhas seu sua nossa ele ela eles elas gente
  tá ta tô estou está esta estava tava foi fui sou era são sao ser estar ter tenho tem tinha
  fiz fazer faço vou vai ir isso isto esse essa este aqui ali lá la muito muita mais menos
  mas também tambem porque por pq quê como quando onde qual quem sei sabe saber quero queria
  gosto gostei hoje ontem amanhã amanha trabalho casa bem bom boa legal obrigado obrigada
  oi olá ola tudo nada coisa dia noite entendi fala falar diz dizer então entao né ne aí
  agora ainda sempre nunca cara mano sobre depois antes acho pode posso consigo
  inglês ingles português portugues se
`.trim().split(/\s+/));

const ACENTO_PT = /[ãõçáéíóúâêôà]/;
const RISADA_PT = /^(k{3,}|(rs)+)$/;

function normalizarApostrofo(texto) {
  return String(texto || '').toLowerCase().replace(/[’‘`´]/g, "'");
}

export function palavras(texto) {
  return normalizarApostrofo(texto).match(/[a-zà-ÿ]+(?:'[a-z]+)?/g) || [];
}

function placar(texto) {
  let en = 0;
  let pt = 0;
  for (const p of palavras(texto)) {
    if (INGLES.has(p)) en += 1;
    else if (PORTUGUES.has(p) || RISADA_PT.test(p)) pt += 1;
    else if (ACENTO_PT.test(p)) pt += 0.5;
  }
  return { en, pt };
}

export function pareceIngles(texto) {
  const { en, pt } = placar(texto);
  return en >= 1 && en > pt;
}

/* Voltou pro português: tem português de verdade na mensagem, e ele empata ou
   ganha do inglês. É a pergunta que "travando" faz — e ela é outra que "não
   parece inglês": uma frase sem palavra de lista nenhuma não é nenhum dos
   dois. */
export function voltouProPortugues(texto) {
  const { en, pt } = placar(texto);
  return pt > 0 && pt >= en;
}

/* PEDIDO DE SOCORRO — "não sei", "como se diz", "idk".

   Compara sem acento ("não sei" e "nao sei" são a mesma frase digitada com
   pressa) e com o apóstrofo já endireitado. Sem acento o `\b` volta a
   funcionar: o `\w` do JavaScript é só ASCII, e depois de um "á" nunca existe
   fronteira de palavra — /sei lá\b/ não casaria nunca.

   As frases em português contam em qualquer tamanho de mensagem. Em inglês há
   dois grupos:

   - SOCORRO_EN_CURTO, só em mensagem CURTA (até 5 palavras): "I don't know"
     sozinho é socorro, mas "I don't know if I like my new job" é uma frase
     inglesa perfeitamente boa, e tratá-la como travar puniria justo quem está
     escrevendo bem.
   - SOCORRO_EN, em qualquer tamanho: as frases que um brasileiro travado
     escreve EM INGLÊS e que não têm outra leitura — "my English is very bad",
     "I don't speak English", "I'm a beginner", "can you speak Portuguese?",
     "I don't know what to say". Sem elas, a pessoa que trava em inglês
     acionava justo o gatilho da acidez: a mensagem é inglês de mais de duas
     palavras, então contava como ACERTO.
     O "não entendi" e o "I'm lost" só valem quando a frase acaba ali (ou no
     "you" / "what you said" / "the question" da própria conversa): "I didn't
     understand the movie" e "I got lost in São Paulo" são relato, não
     socorro. */
const SOCORRO_PT = /\b(nao sei|sei la|nao entendi|nao entendo|como (e que )?(se )?(fala|diz|escreve)|nao consigo|desisto|socorro|me ajuda)\b/;
const SOCORRO_EN_CURTO = /\b(idk|i (don'?t|do not) know|dunno|no idea|help)\b/;
const FIM = String.raw`(?=\s*([,.!?]|$))`;
const SOCORRO_EN = new RegExp([
  String.raw`\bi (really )?(don'?t|didn'?t|do not|did not) (really )?(understand|get it)( (you|what you (said|mean|meant|wrote|asked|want)|your question|the question|this|that|it|anything|nothing|very well|well))?${FIM}`,
  String.raw`\bi('?m| am) (so |totally |completely |a bit |a little )?lost${FIM}`,
  String.raw`\bmy english is (so |very |really |too |still |pretty )?(bad|terrible|poor|weak|horrible|awful|not good|not very good)\b`,
  String.raw`\bi('?m| am) (a |still a |just a |only a )?(beginner|begginer|biginner)\b`,
  String.raw`\bi (don'?t|do not|can'?t|cannot|can not) (speak|write|understand) (much |good |very much )?english\b`,
  String.raw`\b(can|could|do) you (speak|talk|write|explain|answer|reply|say it|say that) (in )?portuguese\b`,
  String.raw`\bi (don'?t|do not) know (what|how) to (say|write|answer|explain|respond|put it)\b`,
].join('|'));

function semAcento(texto) {
  return normalizarApostrofo(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function pedeSocorro(texto) {
  const t = semAcento(texto).trim();
  if (!t) return false;
  if (/^[?¿!.\s]+$/.test(t)) return true;   // só "?" (ou "??", "...")
  if (SOCORRO_PT.test(t) || SOCORRO_EN.test(t)) return true;
  return palavras(texto).length <= 5 && SOCORRO_EN_CURTO.test(t);
}

/* Um sinal de travar, numa mensagem só: pediu socorro, mandou vazio ou uma
   palavra, ou voltou pro português (toda resposta da Cady termina empurrando
   pro inglês, então português aqui é sempre "apesar do empurrão").

   Era `!pareceIngles(texto)`, e isso tratava como travar tudo o que a lista
   curta de palavras não reconhecia: "Reading a book", "Cooking dinner",
   "Software engineer" — respostas curtas e certas às perguntas que o próprio
   prompt manda a Cady fazer. Duas dessas em três mensagens punham no modo
   iniciante (português, a) b) c)) até quem escolheu Ácida. Agora travar
   exige português de verdade na mensagem. */
export function sinalDeTravar(texto) {
  return pedeSocorro(texto) || palavras(texto).length <= 1 || voltouProPortugues(texto);
}

/* TRAVANDO.

   Olha as 3 últimas mensagens do usuário (a atual incluída — o servidor recebe
   o histórico inteiro). Duas com sinal de travar bastam.

   E um PEDIDO DE SOCORRO NA MENSAGEM ATUAL basta sozinho. "Não entendi nada,
   me ajuda" é a pessoa dizendo, com todas as letras, que travou agora — e
   esperar o segundo sinal era responder ESSA mensagem com a Cady ácida (quem
   escolheu Ácida, ou a Equilibrada já liberada). Português e mensagem de uma
   palavra continuam precisando de dois: sozinhos eles podem ser só um "Yes."
   ou um nome de comida. Quem destrava na mensagem seguinte sai do modo
   iniciante do mesmo jeito, porque um sinal só em três não basta.

   As correções seguidas SOZINHAS não bastam, e isto é um desvio consciente do
   desenho original ("2 respostas seguidas da Cady que salvaram correção").
   A Cady corrige quase toda mensagem de quem está aprendendo — é o método.
   Duas correções em fila descrevem igualmente quem escreve parágrafos inteiros
   com um deslize em cada; se isso sozinho virasse modo iniciante, quase todo
   intermediário passaria a receber frase pra completar e pergunta com opções,
   e a Ácida que alguém escolheu nunca apareceria. O que separa travar de
   errar é recuar: por isso as correções seguidas contam quando vêm junto de
   PELO MENOS UM sinal de travar nas últimas três. */
export function estaTravando(mensagens, correcoesSeguidas = 0) {
  const doUsuario = (Array.isArray(mensagens) ? mensagens : [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .slice(-3);
  const atual = doUsuario[doUsuario.length - 1];
  if (atual && pedeSocorro(atual.content)) return true;
  const sinais = doUsuario.filter((m) => sinalDeTravar(m.content)).length;
  return sinais >= 2 || (correcoesSeguidas >= 2 && sinais >= 1);
}

/* A resposta da Cady corrigiu? É o mesmo sinal que a cara dela usa no chat:
   o save_to_review com category 'correction' que a /api/chat devolve em
   `saved`.

   `saved` só traz o que FOI gravado. Se o insert na Revisão falhou, a Cady
   corrigiu do mesmo jeito — e contar aquilo como acerto liberava a acidez
   antes da hora. Por isso a rota devolve também `corrigiu` (a Cady PEDIU pra
   salvar uma correção, gravando ou não), e ele entra aqui como
   `corrigiuServidor`. Só `true` de verdade conta. */
export function corrigiu(saved, corrigiuServidor = false) {
  return corrigiuServidor === true
    || (Array.isArray(saved) && saved.some((x) => x?.category === 'correction'));
}

/* Acerto: uma tentativa em inglês, de pelo menos duas palavras, que não é
   pedido de socorro. A outra metade da definição — a Cady não ter corrigido —
   fica em proximosSinaisTom, que é quem tem a resposta dela na mão.

   Duas palavras e não três: "I'm fine" é uma frase inglesa inteira e certa, e
   o pedido era contar FRASES acertadas, não parágrafos. Uma palavra só
   ("Yes.") não conta: não mostra que ele sabe montar nada. */
export function contaComoAcerto(texto) {
  return palavras(texto).length >= 2 && pareceIngles(texto) && !pedeSocorro(texto);
}

/* O que o TextChatClient guarda entre um envio e outro. Recebe os sinais de
   antes, a mensagem que ele acabou de mandar, o `saved` e o `corrigiu` da
   resposta, e devolve os sinais de agora. Acertos só sobem (é a conta desta
   conversa); correções seguidas zeram na primeira resposta sem correção. */
export function proximosSinaisTom(anterior, textoDoUsuario, saved, corrigiuServidor = false) {
  const a = sanitizarSinaisTom(anterior);
  const c = corrigiu(saved, corrigiuServidor);
  return {
    acertos: Math.min(TETO_SINAL, a.acertos + (!c && contaComoAcerto(textoDoUsuario) ? 1 : 0)),
    correcoesSeguidas: c ? Math.min(TETO_SINAL, a.correcoesSeguidas + 1) : 0,
  };
}

/* A regra de decisão. `conversasAnteriores` é quantas OUTRAS conversas a
   pessoa já teve (a atual fora); null quer dizer "não sei", e aí ela ainda
   conta como estando nas primeiras.

   `estilo` null (ou ausente) também é "não sei": a leitura do Perfil falhou
   neste turno. Normalizar isso pra Equilibrada deixava a Equilibrada veterana
   ficar ácida — e quem escolheu INICIANTE, pego por um erro passageiro no
   banco, recebia a Cady ácida. Na dúvida, suave. A migration 0040 pendente
   NÃO cai aqui: coluna inexistente é um estado conhecido (ninguém escolheu
   nada ainda), e tomServidor.js a trata como Equilibrada. */
export function resolverTom({ estilo, travando = false, conversasAnteriores = null, acertos = 0 } = {}) {
  const e = normalizarEstilo(estilo);
  if (e === 'iniciante' || travando) return 'iniciante';
  if (estilo == null) return TOM_NA_DUVIDA;
  if (e === 'acida') return 'acida';
  const nasPrimeiras = typeof conversasAnteriores !== 'number' || conversasAnteriores < CONVERSAS_SUAVES;
  if (nasPrimeiras) return 'suave';
  return acertos >= ACERTOS_PRA_ACIDEZ ? 'acida' : 'suave';
}
