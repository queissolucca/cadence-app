/* A RESPOSTA DO ESCREVER — o que sai do loop de tool use e vira a bolha.

   Mora aqui, e não dentro de app/api/chat/route.js, por um motivo só: dá pra
   TESTAR. A rota importa Next, Supabase e o SDK da Anthropic; este arquivo não
   importa nada, e recebe o client por parâmetro. Assim os testes rodam a lógica
   de verdade, com respostas montadas à mão, em vez de afirmar sobre o texto da
   fonte.

   O BUG QUE ISTO CONSERTA. A Cady do Escrever respondia muito a frase de
   emergência ("Opa, me perdi aqui — manda de novo? And say it in English this
   time..."), que deveria ser quase impossível de aparecer. Eram duas falhas em
   fila, e as duas moravam no servidor, não no modelo:

   1. O TEXTO QUE VINHA JUNTO COM A FERRAMENTA ERA JOGADO FORA. O prompt manda
      chamar save_to_review depois de toda correção. O jeito natural do modelo
      fazer isso é escrever a resposta inteira E chamar a ferramenta no mesmo
      turno: content = [text, tool_use], stop_reason 'tool_use'. O loop devolvia
      o tool_result e pedia a próxima rodada — que muitas vezes voltava VAZIA
      (end_turn sem bloco nenhum), porque o modelo já tinha dito tudo. A doc da
      Anthropic descreve exatamente isso ("Claude already determined it's done,
      so it will remain done"). E a rota só lia o texto da ÚLTIMA resposta. A
      Cady tinha respondido; o servidor é que não entregava.

   2. A SEGUNDA TENTATIVA ERA UMA REQUISIÇÃO INVÁLIDA. Com o texto perdido, a
      rota pedia de novo SEM `tools`, mandando o convo que já tinha os blocos
      tool_use/tool_result da rodada anterior. A API recusa isso com 400
      ("Requests which include tool_use or tool_result blocks must define
      tools"). O catch engolia o erro sem log nenhum, e caía na frase fixa.

   Por isso ela aparecia "muitas vezes": não era um caso raro de rede. Era o
   turno em que a Cady corrigia e salvava na Revisão, sempre que a rodada depois
   do tool_result voltava vazia — e é justamente o turno que mais importa no
   produto. */

/** Junta os blocos de texto de UMA resposta da API. */
export const textoDe = (resp) => (resp?.content || [])
  .filter((b) => b.type === 'text')
  .map((b) => b.text)
  .join('\n')
  .trim();

/* Onde termina uma frase: depois de . ? ! ou …, contando as aspas e o
   parêntese que fecham logo em seguida ("Say 'I went.' Then..."), e só quando
   vem espaço depois. O ponto de tratamento e de abreviação ("Mr.", "Dr.",
   "e.g.") não conta como fim: sem isso, "Mr." viraria um pedaço sozinho, e
   uma rodada seguinte que falasse de outro "Mr." perderia o título no meio da
   frase. Não é um separador de frases de linguista, e não precisa ser: ele só
   decide o TAMANHO do que se compara, e um pedaço só sai da bolha se for
   idêntico a um pedaço já dito. */
const FIM_DE_FRASE = /(?<=[.?!…]['"’”)\]]*)(?<!\b(?:mrs?|ms|dr|sra?|st|vs|e\.g|i\.e)\.)\s+/i;

/* A forma de comparar duas frases. Caixa e espaço não contam, e as aspas
   tipográficas viram retas: o modelo alterna entre ’ e ' de uma rodada pra
   outra, e a mesma correção não pode entrar duas vezes por causa de um
   apóstrofo. */
const normal = (s) => s
  .toLowerCase()
  .replace(/[‘’‚‛′]/g, "'")
  .replace(/[“”„‟″]/g, '"')
  .replace(/…/g, '...')
  .replace(/\s+/g, ' ')
  .trim();

const frasesDe = (linha) => linha.trim().split(FIM_DE_FRASE).filter((f) => f.trim());

/* A linha de opção do modo iniciante: "a) At home.", "b) Tea." — o único
   formato de lista que o prompt deixa a Cady escrever (lib/cady/promptEscrever.js,
   "# Beginner mode"). */
const OPCAO = /^\s*[a-e]\)\s/i;

/* O TURNO DA CADY É A SOMA DAS RODADAS, SEM REPETIR O QUE ELA JÁ DISSE.

   Recebe o texto de cada rodada do loop, na ordem, e devolve a bolha. Rodada
   vazia não conta. O caso comum é [resposta inteira, ''] — o texto que veio
   junto do tool_use, depois a rodada vazia —, e aí a bolha é a primeira.

   Depois do tool_result o modelo às vezes repete a pergunta final, ou a
   resposta inteira, e sem deduplicar a pessoa leria a mesma pergunta duas vezes
   na mesma bolha. A comparação é por FRASE INTEIRA, contra todas as frases das
   rodadas anteriores:

   - Por frase, e não por linha, porque a quebra de linha não é estável entre
     rodadas. A Cady escreve várias frases numa linha só, e a rodada seguinte
     pode repetir uma delas colada numa frase nova ("Saved! Where did you
     go?"), ou reescrever a resposta inteira numa linha em vez de duas.
     Comparando linhas, as duas repetições passavam. Comparando frases, sai só
     o que já foi dito ("Saved!" fica, a pergunta não volta).

   - Por igualdade, e não por "está contido em", porque inclusão de caracteres
     não respeita palavra: "So?" está dentro de "also?", e uma pergunta nova e
     curta sumia da bolha sem nunca ter sido dita. Só sai uma frase idêntica a
     uma que já saiu.

   A deduplicação é só ENTRE rodadas. Dentro de uma mesma rodada o texto é o
   que o modelo escreveu, e passa como veio — uma linha sem nada repetido sai
   byte por byte igual, inclusive a linha em branco entre parágrafos (a tela é
   pre-wrap, e ela é o respiro entre a bronca e a pergunta).

   A OPÇÃO SEGUE A PERGUNTA DELA. O modo iniciante (lib/cady/tom.js) fecha
   todo turno com uma pergunta e, logo embaixo, as respostas pra escolher e
   digitar: "a) Yes." / "b) No.". Essas linhas são curtas e genéricas de
   propósito, e se repetem de verdade debaixo de perguntas DIFERENTES. Pela
   regra de frase igual, uma pergunta nova na rodada seguinte perdia as
   opções dela — "Yes." e "No." já tinham sido ditas — e ficava pelada, que é
   justo o que o prompt proíbe ("the question never comes bare"). Por isso a
   linha de opção não é comparada sozinha: se a pergunta de cima ficou na
   bolha, as opções dela ficam junto, inteiras; se a pergunta era repetição e
   saiu, as opções repetidas saem com ela.

   O que isto NÃO pega: o modelo reescrever a mesma ideia com outras palavras.
   Não tem como saber isso sem entender o texto, e juntar as duas é menos ruim
   que jogar uma fora — jogar fora foi o bug. */
export function juntarTextos(partes) {
  const linhas = [];
  const ditas = new Set();
  for (const parte of partes || []) {
    if (typeof parte !== 'string' || !parte.trim()) continue;
    const daRodada = [];
    const novas = [];
    // A última frase da linha de cima (a pergunta, quando vêm opções) ficou?
    let perguntaFicou = false;
    for (const linha of parte.trim().split('\n')) {
      const frases = frasesDe(linha);
      if (!frases.length) { novas.push(''); continue; }
      const repetida = (f) => ditas.has(normal(f));
      daRodada.push(...frases.map(normal));
      if (OPCAO.test(linha)) {
        // Inteira ou nada: opção cortada pela metade não é opção.
        if (perguntaFicou || !frases.every(repetida)) novas.push(linha);
        continue;
      }
      const ficam = frases.filter((f) => !repetida(f));
      perguntaFicou = !repetida(frases[frases.length - 1]);
      if (ficam.length === frases.length) novas.push(linha);
      else if (ficam.length) novas.push(ficam.join(' '));
    }
    // Só agora: repetição dentro da própria rodada não é assunto deste filtro.
    daRodada.forEach((f) => ditas.add(f));
    const bloco = novas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (bloco) linhas.push(...bloco.split('\n'));
  }
  return linhas.join('\n').trim();
}

/* A FRASE DE ÚLTIMO RECURSO — só quando nem a segunda tentativa trouxe texto.

   A anterior dizia "me perdi" e mandava "say it in English this time". As duas
   metades estavam erradas: a Cady não se perdeu (quem falhou foi o servidor), e
   a pessoa muitas vezes TINHA escrito em inglês — a frase acusava justamente
   quem fez o certo, e acusava com frequência, por causa do bug acima.

   Esta assume que o problema é do lado de cá, pede pra reenviar e ainda fecha
   com uma pergunta em inglês, que é a regra de todo turno da Cady. É neutra de
   propósito: não sabe o que a pessoa escreveu, então não finge saber.

   Ela continua existindo porque prometer que nunca falha é pior que ter um
   plano B. Mas agora só chega aqui quando NENHUMA rodada escreveu nada E a
   segunda tentativa também falhou ou voltou vazia — e as duas coisas ficam no
   log. Se ela voltar a aparecer com frequência, o log da Vercel diz o porquê. */
export const FRASE_DE_RESERVA = 'Ops, deu um problema aqui do meu lado. Manda de novo? What did you want to tell me?';

/* QUANDO NENHUMA RODADA TROUXE TEXTO, PERGUNTA DE NOVO — COM UMA REQUISIÇÃO QUE A
   API ACEITA.

   `pedido` é a chamada da segunda tentativa, montada pela rota. Aqui ela ganha
   tool_choice {type: 'none'}: as ferramentas continuam DEFINIDAS (é o que torna
   válida uma requisição com blocos de ferramenta, e mantém o mesmo contexto da
   chamada principal), mas o modelo fica proibido de usá-las. Sem ferramenta
   possível, a resposta é texto. `none` existe no SDK desta versão (ToolChoiceNone
   em @anthropic-ai/sdk 0.109.1) e vale pra qualquer modelo — só `any` e `tool`
   têm restrição de modelo.

   E o erro deixou de ser engolido. Se a segunda ida falhar, ou voltar vazia de
   novo, fica no log da Vercel com o motivo — foi a falta desse log que deixou o
   400 acima passar despercebido. */
export async function comTexto(texto, pedido, client) {
  if (texto) return texto;
  try {
    const r = await client.messages.create({ ...pedido, tool_choice: { type: 'none' } });
    const segundo = textoDe(r);
    if (segundo) return segundo;
    console.error('chat: a segunda tentativa também voltou sem texto; vai a frase de reserva', {
      stop_reason: r?.stop_reason,
      blocos: (r?.content || []).map((b) => b.type),
    });
  } catch (err) {
    console.error('chat: a segunda tentativa falhou; vai a frase de reserva', {
      status: err?.status,
      mensagem: err?.message,
    });
  }
  return FRASE_DE_RESERVA;
}
