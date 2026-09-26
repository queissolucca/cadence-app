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
     3. escolheu 'acida'               -> 'acida'.
     4. 'equilibrada' (o padrão): nas 3 primeiras conversas, 'suave'. Depois
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
   português: é o sinal mais forte que um texto curto dá.

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

export function pareceIngles(texto) {
  let en = 0;
  let pt = 0;
  for (const p of palavras(texto)) {
    if (INGLES.has(p)) en += 1;
    else if (PORTUGUES.has(p) || ACENTO_PT.test(p) || RISADA_PT.test(p)) pt += 1;
  }
  return en >= 1 && en > pt;
}

/* PEDIDO DE SOCORRO — "não sei", "como se diz", "idk".

   Compara sem acento ("não sei" e "nao sei" são a mesma frase digitada com
   pressa) e com o apóstrofo já endireitado. Sem acento o `\b` volta a
   funcionar: o `\w` do JavaScript é só ASCII, e depois de um "á" nunca existe
   fronteira de palavra — /sei lá\b/ não casaria nunca.

   As frases em português contam em qualquer tamanho de mensagem. As em inglês
   só em mensagem CURTA (até 5 palavras): "I don't know" sozinho é socorro,
   mas "I don't know if I like my new job" é uma frase inglesa perfeitamente
   boa, e tratá-la como travar puniria justo quem está escrevendo bem. */
const SOCORRO_PT = /\b(nao sei|sei la|nao entendi|como (e que )?(se )?(fala|diz|escreve)|nao consigo|desisto|socorro|me ajuda)\b/;
const SOCORRO_EN = /\b(idk|i (don'?t|do not) know|dunno|no idea|help)\b/;

function semAcento(texto) {
  return normalizarApostrofo(texto).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function pedeSocorro(texto) {
  const t = semAcento(texto).trim();
  if (!t) return false;
  if (/^[?¿!.\s]+$/.test(t)) return true;   // só "?" (ou "??", "...")
  if (SOCORRO_PT.test(t)) return true;
  return palavras(texto).length <= 5 && SOCORRO_EN.test(t);
}

/* Um sinal de travar, numa mensagem só: pediu socorro, mandou vazio ou uma
   palavra, ou escreveu em português (toda resposta da Cady termina empurrando
   pro inglês, então português aqui é sempre "apesar do empurrão"). */
export function sinalDeTravar(texto) {
  return pedeSocorro(texto) || palavras(texto).length <= 1 || !pareceIngles(texto);
}

/* TRAVANDO.

   Olha as 3 últimas mensagens do usuário (a atual incluída — o servidor recebe
   o histórico inteiro). Duas com sinal de travar bastam.

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
  const sinais = doUsuario.filter((m) => sinalDeTravar(m.content)).length;
  return sinais >= 2 || (correcoesSeguidas >= 2 && sinais >= 1);
}

/* A resposta da Cady corrigiu? É o mesmo sinal que a cara dela usa no chat:
   o save_to_review com category 'correction' que a /api/chat devolve em
   `saved`. */
export function corrigiu(saved) {
  return Array.isArray(saved) && saved.some((x) => x?.category === 'correction');
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
   antes, a mensagem que ele acabou de mandar e o `saved` da resposta, e
   devolve os sinais de agora. Acertos só sobem (é a conta desta conversa);
   correções seguidas zeram na primeira resposta sem correção. */
export function proximosSinaisTom(anterior, textoDoUsuario, saved) {
  const a = sanitizarSinaisTom(anterior);
  const c = corrigiu(saved);
  return {
    acertos: Math.min(TETO_SINAL, a.acertos + (!c && contaComoAcerto(textoDoUsuario) ? 1 : 0)),
    correcoesSeguidas: c ? Math.min(TETO_SINAL, a.correcoesSeguidas + 1) : 0,
  };
}

/* A regra de decisão. `conversasAnteriores` é quantas OUTRAS conversas a
   pessoa já teve (a atual fora); null quer dizer "não sei", e aí ela ainda
   conta como estando nas primeiras. */
export function resolverTom({ estilo, travando = false, conversasAnteriores = null, acertos = 0 } = {}) {
  const e = normalizarEstilo(estilo);
  if (e === 'iniciante' || travando) return 'iniciante';
  if (e === 'acida') return 'acida';
  const nasPrimeiras = typeof conversasAnteriores !== 'number' || conversasAnteriores < CONVERSAS_SUAVES;
  if (nasPrimeiras) return 'suave';
  return acertos >= ACERTOS_PRA_ACIDEZ ? 'acida' : 'suave';
}
