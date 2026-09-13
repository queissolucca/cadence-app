import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ehCookieDeSessao } from '../lib/supabase/cookies.js';

/* A REGRA QUE DECIDE ENTRE "VAI PRO LOGIN" E "FICA GIRANDO".

   O portão do /v2 e das telas do funil usa isto pra separar dois casos que
   parecem iguais e pedem respostas opostas: quem nunca entrou (mandar pro login)
   e quem entrou mas não deu pra confirmar agora (deixar onde está, porque
   deslogar alguém por um soluço de rede destrói o que estava acontecendo).

   Errar pro lado do "tem sessão" tem um preço que ninguém previu: a pessoa vê
   "Reconectando…" recarregando a cada 2 segundos, para sempre, sem conseguir nem
   chegar no login. Foi o que aconteceu de verdade na virada de endereço. */

describe('o que conta como cookie de sessão', () => {
  it('o cookie do Supabase conta, inteiro ou partido', () => {
    // Ele é partido em .0/.1 quando passa do limite de tamanho do navegador.
    expect(ehCookieDeSessao('sb-jbcoceuyqydzibyrloko-auth-token')).toBe(true);
    expect(ehCookieDeSessao('sb-jbcoceuyqydzibyrloko-auth-token.0')).toBe(true);
    expect(ehCookieDeSessao('sb-jbcoceuyqydzibyrloko-auth-token.1')).toBe(true);
  });

  /* O CASO QUE PRENDEU GENTE DE VERDADE.

     O Supabase escreve `...auth-token-code-verifier` quando um login por Google
     COMEÇA, e o apaga quando termina. Se o login não termina naquele domínio —
     foi exatamente o que aconteceu na virada, com o Google ainda apontando pro
     endereço velho — o rascunho fica órfão. E um rascunho órfão sendo lido como
     sessão faz o portão servir "Reconectando…" pra sempre, pra alguém que não
     tem sessão nenhuma e só queria chegar no login. */
  it('o rascunho do PKCE NÃO conta — ele não é uma sessão', () => {
    expect(ehCookieDeSessao('sb-jbcoceuyqydzibyrloko-auth-token-code-verifier')).toBe(false);
  });

  it('nada mais conta', () => {
    expect(ehCookieDeSessao('sb-abc-provider-token')).toBe(false);
    expect(ehCookieDeSessao('outro-cookie')).toBe(false);
    expect(ehCookieDeSessao('')).toBe(false);
    expect(ehCookieDeSessao(null)).toBe(false);
    expect(ehCookieDeSessao(undefined)).toBe(false);
  });

  it('a regra mora num módulo sem dependência, pra poder ser testada', () => {
    // Dentro do middleware ela puxaria @supabase/ssr e next/server junto, e uma
    // regra deste peso não pode depender de asserção sobre o texto do arquivo.
    const fonte = readFileSync('lib/supabase/cookies.js', 'utf8');
    expect(fonte).not.toMatch(/^import /m);
    const mw = readFileSync('lib/supabase/middleware.js', 'utf8');
    expect(mw).toContain("import { ehCookieDeSessao } from './cookies'");
    expect(mw).toMatch(/temCookieDeSessao = request\.cookies\.getAll\(\)\.some\(\(c\) => ehCookieDeSessao\(c\.name\)\)/);
  });
});
