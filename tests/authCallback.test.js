import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/* TRÊS FLUXOS DIFERENTES CHEGAM NO /auth/callback, E NÃO DO MESMO JEITO:

     Google (OAuth)          ?code=...
     Confirmação de cadastro ?token_hash=...&type=signup
     Recuperação de senha    ?token_hash=...&type=recovery

   A rota só tratava o primeiro. Quem clicava no link do e-mail chegava sem
   `code` e caía direto na tela de erro — que, por cima, dizia "tente entrar
   com o Google novamente" pra quem nunca tocou no Google.

   Os dois caminhos não são variação de API: `exchangeCodeForSession` exige o
   cookie code-verifier do navegador que ABRIU o fluxo (PKCE), e `verifyOtp`
   não. É por isso que o link do e-mail precisa do segundo — o caso comum é
   se cadastrar no computador e abrir a caixa de entrada no celular. */

const raiz = fileURLToPath(new URL('../', import.meta.url));

/* Sem comentários. Os dois arquivos EXPLICAM o comportamento antigo — um cita
   `exchangeCodeForSession` na abertura, o outro reproduz a frase velha entre
   aspas — e uma asserção sobre o texto cru casaria com a explicação em vez do
   código. Duas destas falharam assim antes de eu cortar. */
/* Só comentário de BLOCO. Cortar `//` por regex também come a string '//' do
   próprio código — que é justamente o que a checagem de redirecionador aberto
   procura. Os dois falsos positivos daqui moram em blocos, então basta. */
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

const ler = (p) => semComentarios(readFileSync(join(raiz, p), 'utf8'));
const rota = ler('app/auth/callback/route.js');
const erro = ler('app/auth/auth-error/page.js');
const conta = ler('lib/comecar/conta.js');

describe('o callback atende os três fluxos', () => {
  it('link de e-mail passa por verifyOtp', () => {
    expect(rota).toContain('verifyOtp');
    expect(rota).toContain('token_hash');
  });

  it('e o verifyOtp vem ANTES do caminho do código', () => {
    /* Ordem importa: um link de e-mail não tem `code`, então se a rota sair
       cedo por falta dele o verifyOtp nunca roda. */
    expect(rota.indexOf('verifyOtp')).toBeLessThan(rota.indexOf('exchangeCodeForSession'));
  });

  it('o Google continua funcionando', () => {
    expect(rota).toContain('exchangeCodeForSession');
  });

  it('só aceita os tipos de link que o Supabase emite', () => {
    for (const t of ['signup', 'recovery', 'magiclink']) expect(rota).toContain(`'${t}'`);
  });
});

describe('o destino não pode sair do site', () => {
  it('`next` só vale se for caminho relativo', () => {
    /* `next` vem da URL. Uma URL absoluta ali transformaria o endpoint num
       redirecionador aberto: um link de e-mail legítimo levando pra fora. */
    expect(rota).toMatch(/startsWith\('\/'\)/);
    expect(rota, 'protocol-relative (//evil.com) também tem que cair')
      .toMatch(/startsWith\('\/\/'\)/);
  });

  it('o padrão é o app, não o caixa', () => {
    // Com o freemium, escrever é grátis: mandar quem confirmou o e-mail pra
    // uma tela de preço é pedir a compra antes de entregar o motivo.
    expect(rota).toMatch(/'\/v2'/);
    expect(conta, 'o link do e-mail ainda aponta pro /pagamento')
      .not.toContain('next=/pagamento');
  });
});

describe('a tela de erro fala com quem chegou nela', () => {
  it('não manda mais todo mundo tentar o Google', () => {
    // Quem confirmou um cadastro por e-mail nunca tocou no Google.
    expect(erro).not.toMatch(/tente entrar com o Google novamente/i);
  });

  it('cada motivo tem texto e uma saída própria', () => {
    for (const m of ['expirado', 'outro_navegador', 'sem_token']) {
      expect(erro, `faltou o motivo ${m}`).toContain(m);
    }
    // "link expirou" e "abriu em outro navegador" pedem ações DIFERENTES;
    // mandar repetir a ação errada é o que faz a pessoa desistir.
    expect(erro).toMatch(/pedir um link novo/);
    expect(erro).toMatch(/entrar com e-mail e senha/);
  });

  it('e o callback informa o motivo', () => {
    expect(rota).toMatch(/auth-error\?motivo=/);
  });
});
