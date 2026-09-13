import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { TELAS_DE_PASSO, TELAS_PUBLICAS, ehTelaPublica, proximoPasso } from '../lib/funil.js';

/* A VITRINE DO PREÇO NÃO PODE PEDIR CADASTRO PRA SER VISTA.

   O /pagamento estava no mesmo balde dos outros passos do funil, e o portão
   mandava pro /login quem chegasse sem conta. Isso inverte a ordem: pede que a
   pessoa crie conta antes de saber quanto custa. Quem só queria ver o valor vai
   embora, e não fica registro nenhum de que foi embora.

   A diferença entre as telas não é de configuração, é de natureza: /onboarding e
   /v2/onboarding são formulários sobre alguém que já existe no banco — sem conta
   não há o que perguntar nem onde gravar. O /pagamento é a vitrine. */

describe('quais telas do funil abrem sem conta', () => {
  it('a de pagamento abre', () => {
    expect(ehTelaPublica('/pagamento')).toBe(true);
  });

  it('as que precisam de uma conta pra existir, não', () => {
    expect(ehTelaPublica('/onboarding')).toBe(false);
    expect(ehTelaPublica('/v2/onboarding')).toBe(false);
    expect(ehTelaPublica('/v2')).toBe(false);
    expect(ehTelaPublica('')).toBe(false);
  });

  it('toda tela pública é também um passo do funil', () => {
    // Uma pública que não fosse passo nunca seria consultada pelo portão — seria
    // uma configuração que não faz nada, do tipo que engana quem for ler depois.
    for (const t of TELAS_PUBLICAS) expect(TELAS_DE_PASSO).toContain(t);
  });

  it('o funil continua mandando quem não pagou pro pagamento', () => {
    // A cancela não se moveu: ela continua entre "ver o preço" e "entrar no app".
    expect(proximoPasso({ pago: false, nome: 'Lucca' })).toBe('/pagamento');
    expect(proximoPasso({ pago: true, nome: '' })).toBe('/v2/onboarding');
    expect(proximoPasso({ pago: true, nome: 'Lucca' })).toBeNull();
  });
});

describe('o portão trata as duas naturezas de forma diferente', () => {
  const MW = readFileSync('middleware.js', 'utf8');

  it('sem conta: a pública abre, as outras vão pro login', () => {
    expect(MW).toContain("import { ehTelaPublica, proximoPasso, TELAS_DE_PASSO } from './lib/funil'");
    expect(MW).toMatch(/if \(ehTelaPublica\(pathname\)\) return response;/);
    expect(MW).toMatch(/NextResponse\.redirect\(new URL\('\/login', request\.url\)\)/);
  });

  it('na dúvida, a pública também abre em vez de girar', () => {
    /* Numa página que nem precisa de sessão, o pior desfecho possível é prender
       alguém na tela de reconectar por causa de um cookie ilegível. */
    const i = MW.indexOf('if (precisaLogar || semConfirmar) {');
    expect(i).toBeGreaterThan(-1);
    const bloco = MW.slice(i, i + 300);
    expect(bloco.indexOf('ehTelaPublica'), 'a checagem de pública tem que vir antes de decidir').toBeLessThan(bloco.indexOf('reconectando()'));
  });

  it('a tela sabe renderizar sem usuário — senão abrir sem conta daria erro', () => {
    const pag = readFileSync('app/pagamento/page.js', 'utf8');
    expect(pag).toMatch(/email=\{user\?\.email \|\| ''\}/);
    expect(pag, 'os dados extras só são buscados quando há usuário').toMatch(/if \(user\)/);
  });

  it('mas o botão de pagar continua exigindo conta', () => {
    // A cancela está na hora de COBRAR, não na de mostrar.
    const rota = readFileSync('app/api/checkout/route.js', 'utf8');
    expect(rota).toMatch(/if \(!user\) return NextResponse\.json\(\{ error: 'not_authenticated' \}, \{ status: 401 \}\)/);
    const botao = readFileSync('components/v2/CheckoutButton.js', 'utf8');
    expect(botao).toMatch(/res\.status === 401/);
  });
});

describe('nenhum soluço pode esconder o preço', () => {
  const PAG = readFileSync('app/pagamento/page.js', 'utf8');
  /* A tela virou a vitrine. A identidade serve pra personalizar — e-mail
     preenchido, os minutos escolhidos, a copy de "expirado" — e não pra decidir
     se a página existe. Falhar pra "anônimo" custa um campo vazio; falhar pra
     erro custa a venda. */
  it('a identidade vem do cabeçalho do middleware, sem ida à rede', () => {
    expect(PAG).toContain("import { identidade } from '../../lib/sessaoServidor'");
    expect(PAG, 'getUser() é uma requisição ao servidor de auth a cada visita')
      .not.toMatch(/supabase\.auth\.getUser\(\)/);
  });

  it('e vem dentro de um try — a página não morre com ela', () => {
    expect(PAG).toMatch(/try \{\s*\n\s*eu = await identidade\(\);\s*\n\s*\} catch/);
  });

  it('as consultas de personalização também não derrubam a página', () => {
    const i = PAG.indexOf('if (user) {');
    const bloco = PAG.slice(i, i + 1200);
    expect(bloco).toContain('try {');
    expect(bloco).toMatch(/\} catch \{/);
    expect(bloco).toContain('paid_emails');
  });
});
