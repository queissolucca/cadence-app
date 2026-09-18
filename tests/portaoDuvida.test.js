import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { proximoPasso } from '../lib/funil.js';

/* "NÃO SEI" NÃO PODE VIRAR "NÃO PAGOU".

   O bug que isto fixa tirava a pessoa do meio da conversa com a Cady. O
   `maybeSingle()` do Supabase devolve `{data:null, error:null}` quando não há
   linha e `{data:null, error:<algo>}` quando a consulta FALHOU. O portão olhava
   só o `data`, então tratava os dois como "não pagou".

   O estrago, em ordem: o middleware roda a cada requisição e uma chamada de voz
   satura a conexão → um errinho de rede numa consulta → expulsa pro /pagamento
   → lá a consulta vai bem e a pessoa já pagou → manda pro /v2. Da cadeira dela:
   estava conversando e caiu na tela de início, sem explicação, a cada 20-30s.

   A regra que ficou, e ela é assimétrica de propósito:
     • PÁGINA, na dúvida: fica onde está. Não é abrir a porta — a pessoa já está
       dentro e passou pelo portão pra chegar ali. Tirá-la por soluço do banco é
       punir o usuário por um problema que não é dele.
     • API, na dúvida: NEGA. Cada chamada liberada por engano queima token da
       Anthropic ou minuto do ElevenLabs. Errar pra menos custa uma tentativa
       repetida; errar pra mais custa dinheiro.

   Os testes de comportamento leem o middleware como TEXTO porque ele não é
   importável fora do runtime do Next. É frágil a refatoração, e é de propósito:
   se alguém reescrever estas linhas, o teste cai e obriga a reler a regra. */

const MW = readFileSync('middleware.js', 'utf8');

describe('leitura que falhou é diferente de leitura que disse não', () => {
  it('a dúvida continua sendo undefined, onde quer que a regra viva', () => {
    /* A consulta saiu do middleware e foi pra lib/acessoPago.js, junto com as
       dos outros três leitores — quatro cópias da mesma regra é como elas
       divergem. O que este teste trava não é ONDE ela mora, e sim que ela
       continua distinguindo "não pagou" de "não deu pra saber".

       A distinção é o coração deste arquivo: `false` expulsa a pessoa,
       `undefined` deixa ela onde está. Colapsar os dois num booleano faz um
       soluço de rede parecer falta de pagamento. */
    expect(MW).toContain('acessoPagoDe');
    const helper = readFileSync('lib/acessoPago.js', 'utf8');
    expect(helper).toContain('if (r.error) return undefined;');
    // e o `false` de "não pagou" continua existindo, separado
    expect(helper).toMatch(/if \(!linhas\.length\) return false;/);
  });

  it('nextStep propaga a dúvida em vez de inventar um passo', () => {
    expect(MW).toMatch(/if \(perfil\.error \|\| pago === undefined\) return undefined;/);
  });

  it('nas páginas, a dúvida deixa a pessoa onde ela está', () => {
    /* Era 2 (telas-de-passo e /v2/*) e virou 1: o bloco do /v2 não consulta
       mais nextStep(), porque entrar no app deixou de depender de pagamento.
       Sobrou o das telas de passo, que ainda decide entre /pagamento e
       /v2/onboarding. */
    const trechos = MW.match(/if \(step === undefined\) return response;/g) || [];
    expect(trechos.length).toBe(1);
  });

  it('o /v2 não pergunta mais pelo pagamento pra deixar entrar', () => {
    // Se voltar a perguntar, o app grátis deixa de existir sem ninguém notar.
    const i = MW.indexOf('LOGIN_REQUIRED_PREFIXES.some');
    // Sem comentários: o bloco EXPLICA que o redirect pro /pagamento saiu, e
    // a asserção casaria com a própria explicação.
    const bloco = MW.slice(i, i + 900)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(bloco, 'o /v2 voltou a consultar o funil').not.toContain('nextStep()');
    expect(bloco, 'o /v2 voltou a redirecionar pro caixa').not.toContain('/pagamento');
  });

  it('nas rotas de API, a dúvida continua negando', () => {
    expect(MW).toContain("if (pago === undefined) return nega(503, 'try_again');");
    expect(MW).toContain("if (!pago) return nega(402, 'payment_required');");
    // E negar por dúvida não pode virar 402: 402 diz "pague", e a pessoa já
    // pagou. 503 diz "tenta de novo", que é o que de fato aconteceu.
    const i = MW.indexOf("if (pago === undefined)");
    expect(MW.slice(i, i + 80)).not.toContain('402');
  });
});

describe('o funil com o que sobrou', () => {
  it('só o nome decide, agora que o pagamento saiu do funil', () => {
    expect(proximoPasso({ pago: false, nome: 'Lucca' })).toBeNull();
    expect(proximoPasso({ pago: true, nome: '' })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: 'Lucca' })).toBeNull();
  });

  /* Este teste existia pra mostrar que passar `undefined` como `pago` dava a
     resposta ERRADA ("vai pagar"), e que por isso a dúvida tinha que ser
     tratada no middleware, antes da chamada.

     Com o pagamento fora do funil, `pago` deixou de influenciar o resultado —
     então esse risco específico acabou. O que continua valendo é a REGRA: a
     dúvida se trata antes, não aqui. E o middleware continua sendo quem a
     trata, nas rotas de API, que é onde ela custa dinheiro. */
  it('pago não muda mais o resultado — nem quando vem undefined', () => {
    for (const pago of [true, false, undefined]) {
      expect(proximoPasso({ pago, nome: 'Lucca' })).toBeNull();
      expect(proximoPasso({ pago, nome: '' })).toBe('/v2/onboarding');
    }
  });
});
