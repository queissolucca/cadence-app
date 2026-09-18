import { describe, it, expect } from 'vitest';
import { lerFonte as ler } from './fonte.js';
import { acessoPagoDe, validadeAtual, baseDaRenovacao } from '../lib/acessoPago.js';
import { getPlan } from '../lib/plans.js';
import { validadeEmDias } from '../lib/payments.js';

/* O PRAZO PRECISA MESMO ACABAR — E SOBREVIVER A UMA SEGUNDA COMPRA.

   `paid_emails` guarda uma linha por COMPRA agora, não por e-mail. Isso quebra
   duas suposições que estavam espalhadas pelo código: que existia no máximo
   uma linha (os quatro leitores usavam `.maybeSingle()`, que ERRA com mais de
   uma) e que a última escrita era a que valia (falso: quem compra 3 meses e
   depois 7 dias não pode ter o acesso encurtado pela compra menor).

   Estes testes rodam a regra de verdade contra um Supabase de mentira, em vez
   de conferir o texto dos arquivos. */

// Supabase mínimo: só o encadeamento que o lib/acessoPago usa.
const fakeSupabase = (linhas, erro = null) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        order: (col, { ascending, nullsFirst }) => ({
          limit: async () => {
            if (erro) return { error: erro, data: null };
            const ord = [...linhas].sort((a, b) => {
              if (!a.expires_at) return nullsFirst ? -1 : 1;
              if (!b.expires_at) return nullsFirst ? 1 : -1;
              const d = new Date(b.expires_at) - new Date(a.expires_at);
              return ascending ? -d : d;
            });
            return { error: null, data: ord };
          },
        }),
      }),
    }),
  }),
});

const emDias = (n) => new Date(Date.now() + n * 86400000).toISOString();

describe('quem tem acesso', () => {
  it('sem linha nenhuma, não tem', async () => {
    expect(await acessoPagoDe(fakeSupabase([]), 'a@b.com')).toBe(false);
  });

  it('com prazo no futuro, tem', async () => {
    expect(await acessoPagoDe(fakeSupabase([{ expires_at: emDias(3) }]), 'a@b.com')).toBe(true);
  });

  it('com prazo vencido, NÃO tem — mesmo estando na tabela', async () => {
    // É o caso que o plano semanal criou: o e-mail continua lá, o acesso não.
    expect(await acessoPagoDe(fakeSupabase([{ expires_at: emDias(-1) }]), 'a@b.com')).toBe(false);
  });

  it('linha sem prazo é vitalícia', async () => {
    // As contas liberadas à mão antes de existirem planos com validade.
    expect(await acessoPagoDe(fakeSupabase([{ expires_at: null }]), 'a@b.com')).toBe(true);
  });

  it('consulta que falha vira "não sei", e não "não pagou"', async () => {
    /* Quem chama decide: nas páginas a pessoa fica onde está, nas rotas de API
       a dúvida NEGA. Devolver false aqui expulsaria quem pagou por um soluço
       de rede. */
    const r = await acessoPagoDe(fakeSupabase([], { message: 'timeout' }), 'a@b.com');
    expect(r).toBeUndefined();
  });
});

describe('duas compras', () => {
  it('vale a que vai MAIS LONGE, não a mais recente', async () => {
    /* Comprou 3 meses e depois experimentou uma semana: a linha mais recente é
       a curta, e ela não pode encurtar o acesso já pago. */
    const linhas = [{ expires_at: emDias(80) }, { expires_at: emDias(7) }];
    expect(await acessoPagoDe(fakeSupabase(linhas), 'a@b.com')).toBe(true);
    expect(await validadeAtual(fakeSupabase(linhas), 'a@b.com')).toBe(linhas[0].expires_at);
  });

  it('uma linha vitalícia ganha de qualquer prazo', async () => {
    const linhas = [{ expires_at: emDias(-30) }, { expires_at: null }];
    expect(await acessoPagoDe(fakeSupabase(linhas), 'a@b.com')).toBe(true);
  });

  it('duas compras vencidas continuam vencidas', async () => {
    const linhas = [{ expires_at: emDias(-1) }, { expires_at: emDias(-40) }];
    expect(await acessoPagoDe(fakeSupabase(linhas), 'a@b.com')).toBe(false);
  });
});

describe('o prazo soma, em vez de recomeçar', () => {
  it('comprar com acesso vigente estende a partir do fim', () => {
    /* Quem compra uma semana faltando cinco dias não pode PERDER esses cinco —
       seria punido por renovar cedo. */
    const agora = new Date('2026-09-18T12:00:00Z');
    const vigente = '2026-09-23T12:00:00Z';        // faltam 5 dias
    const base = baseDaRenovacao(vigente, agora);
    expect(validadeEmDias(7, base).slice(0, 10)).toBe('2026-09-30');
  });

  it('comprar depois de vencido conta de hoje', () => {
    const agora = new Date('2026-09-18T12:00:00Z');
    const base = baseDaRenovacao('2026-08-01T12:00:00Z', agora);
    expect(validadeEmDias(7, base).slice(0, 10)).toBe('2026-09-25');
  });

  it('sem compra anterior, conta de hoje', () => {
    const agora = new Date('2026-09-18T12:00:00Z');
    expect(baseDaRenovacao(null, agora)).toBe(agora);
  });
});

describe('a conta de cada plano', () => {
  it('o semanal dá 7 dias', () => {
    expect(validadeEmDias(getPlan('pro-semanal').dias, new Date('2026-09-18T15:00:00Z')).slice(0, 10))
      .toBe('2026-09-25');
  });

  it('o trimestral dá 90', () => {
    expect(validadeEmDias(getPlan('pro-trimestral').dias, new Date('2026-09-18T15:00:00Z')).slice(0, 10))
      .toBe('2026-12-17');
  });
});

describe('ninguém tem a sua própria cópia da regra', () => {
  const LEITORES = [
    ['middleware.js', 'o portão das páginas e das rotas de API'],
    ['lib/sessaoServidor.js', 'o cadeado da aba Trilha'],
    ['app/api/checkout/status/route.js', 'o polling do /obrigado'],
    ['app/pagamento/page.js', 'a tela de preço'],
  ];

  it.each(LEITORES)('%s delega em vez de consultar', (arquivo) => {
    /* Quatro cópias da mesma consulta é como elas divergem — e foi por isso
       que a troca pra várias linhas quebraria os quatro de uma vez: todos
       usavam `.maybeSingle()`, que erra com mais de uma. */
    const src = ler(arquivo);
    expect(src, `${arquivo} voltou a consultar paid_emails direto`)
      .not.toMatch(/from\('paid_emails'\)/);
    expect(src).toMatch(/acessoPagoDe|validadeAtual/);
  });
});

describe('a escrita nunca perde o prazo', () => {
  const wh = ler('app/api/webhooks/abacatepay/route.js');

  it('grava uma linha por compra, sem sobrescrever', () => {
    expect(wh, 'voltou a sobrescrever a compra anterior').not.toMatch(/onConflict: 'email'/);
    expect(wh).toMatch(/paid_emails'\)\.insert\(/);
  });

  it('todos os degraus da degradação levam expires_at', () => {
    /* O último degrau era `{ email }` — e linha sem prazo lê como vitalícia.
       Um soluço do banco na hora errada transformaria R$ 19,90 em acesso
       permanente. */
    const inserts = [...wh.matchAll(/paid_emails'\)\.insert\(\{([^}]*)\}/g)].map((m) => m[1]);
    expect(inserts.length).toBeGreaterThan(0);
    for (const campos of inserts) {
      expect(campos, `insert sem expires_at: {${campos.trim()}}`).toContain('expires_at');
    }
  });

  it('o prazo do plano comprado, somado ao que sobrou', () => {
    expect(wh).toMatch(/getPlan\(pedido\?\.plan\)/);
    expect(wh).toMatch(/baseDaRenovacao\(vigente\)/);
    expect(wh).toMatch(/validadeEmDias\(dias, desde\)/);
  });
});
