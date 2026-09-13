import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { destinoDoDominio, DOMINIO, URL_BASE, DOMINIOS_ANTIGOS, SEM_REDIRECT } from '../lib/dominio.js';

/* O ENDEREÇO MUDOU, E O ANTIGO NÃO PODE MORRER.

   Um domínio aposentado continua vivo em e-mail já enviado, em print, em
   favorito, em resultado de busca. Deixá-lo dar erro é perder essas pessoas em
   silêncio — elas não sabem que o produto continua existindo, só veem uma
   página que não abre.

   O que estes testes seguram não é o redirect em si (esse é fácil): é o que
   acontece com quem NÃO é um navegador, e o laço que uma lista mal escrita
   criaria. */

describe('quem chega pelo endereço antigo vai pro novo', () => {
  it('leva o caminho e a query junto', () => {
    // Sem isso, quem clicou num link pra /pagamento cai na home e some.
    expect(destinoDoDominio({ host: 'cadenceenglish.app', pathname: '/pagamento' }))
      .toBe('https://heycady.com/pagamento');
    expect(destinoDoDominio({ host: 'cadenceenglish.app', pathname: '/v2/conversar', search: '?latencia=1' }))
      .toBe('https://heycady.com/v2/conversar?latencia=1');
  });

  it('o www também — é como muita gente digita', () => {
    expect(destinoDoDominio({ host: 'www.cadenceenglish.app', pathname: '/' })).toBe('https://heycady.com/');
  });

  it('não se importa com caixa nem com a porta', () => {
    expect(destinoDoDominio({ host: 'CadenceEnglish.App', pathname: '/v2' })).toBe('https://heycady.com/v2');
    expect(destinoDoDominio({ host: 'cadenceenglish.app:443', pathname: '/v2' })).toBe('https://heycady.com/v2');
  });

  it('caminho vazio vira a raiz, não uma URL quebrada', () => {
    expect(destinoDoDominio({ host: 'cadenceenglish.app', pathname: '' })).toBe('https://heycady.com/');
  });
});

describe('quem NÃO pode ser redirecionado', () => {
  /* Redirect é uma resposta que só serve pra quem sabe segui-la. Um servidor de
     pagamento mandando um POST de webhook muitas vezes não segue — e mesmo os
     que seguem podem descartar o corpo. Um webhook perdido é alguém que pagou e
     não recebeu acesso: o pior defeito possível, e um que não dá erro em lugar
     nenhum. */
  it('webhook no endereço antigo continua sendo atendido lá', () => {
    expect(destinoDoDominio({ host: 'cadenceenglish.app', pathname: '/api/webhooks/abacatepay', search: '?webhookSecret=x' }))
      .toBeNull();
    expect(destinoDoDominio({ host: 'cadenceenglish.app', pathname: '/api/webhooks/kiwify' })).toBeNull();
  });

  it('a lista de exceções existe e cobre os webhooks', () => {
    expect(SEM_REDIRECT).toContain('/api/webhooks/');
  });
});

describe('nada que já está no lugar certo se mexe', () => {
  it('o domínio novo não redireciona — senão é laço infinito', () => {
    expect(destinoDoDominio({ host: DOMINIO, pathname: '/v2' })).toBeNull();
    expect(DOMINIOS_ANTIGOS, 'o domínio novo entrou na lista de antigos: isso é um laço').not.toContain(DOMINIO);
  });

  it('preview da Vercel e desenvolvimento seguem funcionando', () => {
    expect(destinoDoDominio({ host: 'cadence-app-abc123.vercel.app', pathname: '/v2' })).toBeNull();
    expect(destinoDoDominio({ host: 'localhost:3000', pathname: '/v2' })).toBeNull();
  });

  it('host vazio ou ausente não vira redirect', () => {
    expect(destinoDoDominio({ host: '', pathname: '/v2' })).toBeNull();
    expect(destinoDoDominio({ pathname: '/v2' })).toBeNull();
    expect(destinoDoDominio()).toBeNull();
  });
});

describe('o endereço é uma constante só', () => {
  /* Ele aparece no redirect, nos metadados (canonical, og:image) e nas URLs de
     retorno do pagamento. Espalhado, diverge na primeira troca — e a divergência
     aparece do pior jeito: um link de compartilhamento que leva pro lugar errado. */
  it('URL_BASE é derivado de DOMINIO', () => {
    expect(URL_BASE).toBe(`https://${DOMINIO}`);
  });

  it('nenhum outro arquivo do projeto escreve o domínio antigo', () => {
    const raizes = ['app', 'lib', 'components', 'tests', 'docs'];
    const achados = [];
    const varrer = (dir) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) { varrer(caminho); continue; }
        if (!/\.(js|md|css|html|sql)$/.test(nome)) continue;
        // A fonte da lista e este próprio teste são os dois lugares onde o
        // endereço antigo PRECISA estar escrito.
        if (caminho === join('lib', 'dominio.js')) continue;
        if (caminho === join('tests', 'dominio.test.js')) continue;
        if (readFileSync(caminho, 'utf8').includes('cadenceenglish')) achados.push(caminho);
      }
    };
    for (const r of raizes) varrer(r);
    expect(achados).toEqual([]);
  });

  it('o metadataBase usa a constante, não um literal', () => {
    const layout = readFileSync('app/comecar/layout.js', 'utf8');
    expect(layout).toContain("import { URL_BASE } from '../../lib/dominio'");
    expect(layout).toMatch(/metadataBase: new URL\(process\.env\.NEXT_PUBLIC_APP_URL \|\| URL_BASE\)/);
  });
});

describe('o middleware redireciona antes de trabalhar', () => {
  const MW = readFileSync('middleware.js', 'utf8');
  /* Quem chega pelo endereço aposentado não vai ficar: não há por que gastar uma
     verificação de sessão nem uma consulta ao banco de acesso. E mexer em cookie
     de sessão num domínio que está sendo desligado é pedir problema — o token
     que vale é o do domínio novo. */
  it('o redirect vem ANTES do updateSession', () => {
    const iRedirect = MW.indexOf('destinoDoDominio({');
    const iSessao = MW.indexOf('await updateSession(request)');
    expect(iRedirect).toBeGreaterThan(-1);
    expect(iRedirect).toBeLessThan(iSessao);
  });

  it('usa 308, que preserva o método', () => {
    // Com 301, parte dos clientes transforma um POST em GET e o corpo se perde
    // sem erro nenhum.
    expect(MW).toMatch(/NextResponse\.redirect\(enderecoNovo, 308\)/);
  });
});
