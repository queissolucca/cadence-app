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
  it('acessoPago devolve undefined quando a consulta erra', () => {
    // `if (paid.error) return undefined` tem que existir DEPOIS do fallback de
    // coluna — senão o próprio fallback (que erra de propósito na 1ª tentativa)
    // seria lido como falha.
    const i = MW.indexOf('async function acessoPago()');
    const corpo = MW.slice(i, MW.indexOf('}', MW.indexOf('return !!row')));
    expect(corpo).toContain('return undefined');
    // a ordem: o fallback vem antes do return undefined
    expect(corpo.indexOf("select('email')")).toBeLessThan(corpo.indexOf('return undefined'));
  });

  it('nextStep propaga a dúvida em vez de inventar um passo', () => {
    expect(MW).toMatch(/if \(perfil\.error \|\| pago === undefined\) return undefined;/);
  });

  it('nas páginas, a dúvida deixa a pessoa onde ela está', () => {
    const trechos = MW.match(/if \(step === undefined\) return response;/g) || [];
    // Os dois blocos de página: telas-de-passo e /v2/*.
    expect(trechos.length).toBe(2);
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
  it('sem dúvida nenhuma, a ordem continua a mesma', () => {
    expect(proximoPasso({ pago: false, nome: 'Lucca' })).toBe('/pagamento');
    expect(proximoPasso({ pago: true, nome: '' })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: 'Lucca' })).toBeNull();
  });

  /* `proximoPasso` continua sendo função de dois fatos CONHECIDOS: quem decide
     o que fazer com a dúvida é o middleware, antes de chamar. Se um dia alguém
     passar `undefined` aqui achando que a função trata, isto documenta que não:
     ela responde "vai pagar", que é justamente a resposta errada. */
  it('proximoPasso não é o lugar de tratar dúvida — e o teste diz por quê', () => {
    expect(proximoPasso({ pago: undefined, nome: 'Lucca' })).toBe('/pagamento');
  });
});
