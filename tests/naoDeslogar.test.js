import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* NUNCA DESLOGAR ALGUÉM QUE NÃO PEDIU PRA SAIR.

   O relato: conversando com o microfone aberto, às vezes a Cady parava de
   responder e a tela caía no login. Duas falhas diferentes, e esta é a segunda.

   A causa: `user` nulo tinha um significado só — "anônimo" — e anônimo vira
   redirect pro /login. Mas ele fica nulo por DOIS motivos: não há sessão
   nenhuma, ou não deu pra confirmar a que existe. O segundo acontece
   exatamente quando a rede está apertada, que é o que uma chamada de voz faz.

   Some a isso a rotação de refresh token do Supabase: cada cliente criado num
   Server Component podia renovar o token, e num Server Component a gravação do
   cookie é ENGOLIDA pelo Next. A rotação acontecia no servidor e o navegador
   ficava com um refresh token inválido — deslogado de verdade, não por engano
   de roteamento.

   O middleware lê como TEXTO porque não é importável fora do runtime do Next.
   Frágil a refatoração de propósito: se alguém reescrever estas linhas, o teste
   cai e obriga a reler a regra. */

const MW = readFileSync('middleware.js', 'utf8');
const SUP = readFileSync('lib/supabase/middleware.js', 'utf8');
const SESSAO = readFileSync('lib/sessaoServidor.js', 'utf8');

describe('dúvida sobre a sessão não desloga', () => {
  it('"sem cookie" e "não deu pra confirmar" são coisas diferentes', () => {
    expect(SUP).toMatch(/temCookieDeSessao/);
    // Por prefixo: o cookie do Supabase vem partido em .0/.1 quando cresce.
    expect(SUP).toMatch(/startsWith\('sb-'\)/);
    expect(MW).toContain('const precisaLogar = !user && !temCookieDeSessao;');
    expect(MW).toContain('const semConfirmar = !user && temCookieDeSessao;');
  });

  it('só quem não tem cookie nenhum é mandado pro login', () => {
    // Nenhum redirect pro /login pode mais depender de `!user` cru.
    const redirects = MW.match(/if \(![^)]*\) return NextResponse\.redirect\(new URL\('\/login'/g) || [];
    expect(redirects, 'redirect pro login tem que passar por precisaLogar').toEqual([]);
    expect((MW.match(/if \(precisaLogar\) return NextResponse\.redirect\(new URL\('\/login'/g) || []).length).toBe(2);
  });

  /* Sem identidade a tela do app não tem como ser montada (ela é feita do
     perfil, do streak, das conversas da pessoa). Nem deslogar, nem estourar
     erro: uma tela que diz "reconectando" e recarrega sozinha em 2s. O rewrite
     mantém a URL, então o reload volta pra onde a pessoa estava. */
  it('na dúvida, mostra "reconectando" sem sair da URL', () => {
    expect((MW.match(/if \(semConfirmar\) return reconectando\(\);/g) || []).length).toBe(2);
    expect(MW).toContain("NextResponse.rewrite(new URL('/reconectando'");
    expect(MW).not.toMatch(/semConfirmar[\s\S]{0,40}redirect\(new URL\('\/login'/);
  });

  it('na API, a dúvida é 503 e não 401 — 401 o cliente lê como sessão morta', () => {
    expect(MW).toContain("if (semConfirmar) return nega(503, 'try_again');");
    const i = MW.indexOf('if (semConfirmar) return nega(');
    const j = MW.indexOf("if (!user) return nega(401");
    expect(i, 'a checagem de dúvida vem ANTES da de anônimo').toBeLessThan(j);
  });
});

describe('identidade é resolvida num lugar só', () => {
  it('o middleware entrega a identidade verificada por cabeçalho', () => {
    expect(SUP).toContain("export const H_UID = 'x-cadence-uid'");
    expect(SUP).toMatch(/headers\.set\(H_UID, user\.id\)/);
  });

  /* Sem o delete, um cabeçalho vindo de fora sobreviveria e qualquer pessoa se
     declararia dona de qualquer conta mandando um header. É o que torna o
     esquema seguro, não um detalhe de higiene. */
  it('o cabeçalho é apagado antes de ser gravado, sempre', () => {
    const iDel = SUP.indexOf('headers.delete(H_UID)');
    const iSet = SUP.indexOf('headers.set(H_UID');
    expect(iDel).toBeGreaterThan(-1);
    expect(iDel, 'apagar tem que vir antes de gravar').toBeLessThan(iSet);
  });

  it('as telas leem o cabeçalho antes de perguntar ao Supabase', () => {
    const i = SESSAO.indexOf('h.get(H_UID)');
    const j = SESSAO.indexOf('identidadeDe(createClient())');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(-1);
    expect(i, 'o cabeçalho é o primeiro caminho, não o último').toBeLessThan(j);
  });
});

describe('o microfone nunca fica fechado pra sempre', () => {
  const CONV = readFileSync('components/v2/ConversationClient.js', 'utf8');

  /* O sintoma disto não parece bug de microfone: parece que ela parou de
     responder. A pessoa fala, repete, e nada acontece — porque não está sendo
     ouvida, e nada na tela diz isso. */
  it('existe uma rede de segurança que reabre o que nós fechamos', () => {
    expect(CONV).toMatch(/REDE DE SEGURANÇA DO MICROFONE/);
    expect(CONV).toMatch(/mudoPorNos\.current && conversation\.isMuted && !conversation\.isSpeaking/);
    expect(CONV).toMatch(/conversation\.setMuted\(false\)/);
  });

  it('ela só mexe no que fomos nós que fechamos', () => {
    // Quem se mutou sozinho continua mudo: a condição exige mudoPorNos.
    const i = CONV.indexOf('REDE DE SEGURANÇA DO MICROFONE');
    const trecho = CONV.slice(i, i + 1600);
    expect(trecho).toContain('mudoPorNos.current');
    expect(trecho).not.toMatch(/setMuted\(false\);\s*\n\s*\}\s*catch/); // não é incondicional
  });
});
