/* UM SUPABASE DE MENTIRA, SÓ O SUFICIENTE PRA RODAR AS LEITURAS DE VERDADE.

   O código do tom (lib/cady/tomServidor.js) e as rotas que ele toca recebem ou
   criam um client do Supabase e encadeiam `.from().select().eq()...`. Este
   falso grava cada consulta (tabela, colunas, filtros, update/insert) e
   devolve o que a função `responder` do teste mandar — inclusive `{ error }`,
   que é como o Postgres responde a uma coluna que ainda não existe. É isso que
   deixa testar a regra do dono ("sem quebrar nada") rodando o código, e não
   lendo a fonte.

   Não é `*.test.js`, então o vitest não o coleta como suíte. */
export function supabaseFalso(responder, { userId = 'u1' } = {}) {
  const consultas = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from(tabela) {
      const q = { tabela, colunas: null, opcoes: null, filtros: [], update: null, insert: null };
      consultas.push(q);
      const resolver = () => responder(q);
      const b = {
        select(colunas, opcoes) { q.colunas = colunas; q.opcoes = opcoes || null; return b; },
        eq(coluna, valor) { q.filtros.push(['eq', coluna, valor]); return b; },
        neq(coluna, valor) { q.filtros.push(['neq', coluna, valor]); return b; },
        gte(coluna, valor) { q.filtros.push(['gte', coluna, valor]); return b; },
        not(coluna, operador, valor) { q.filtros.push(['not', coluna, operador, valor]); return b; },
        order() { return b; },
        limit() { return b; },
        update(obj) { q.update = obj; return b; },
        insert(obj) { q.insert = obj; return b; },
        maybeSingle() { return Promise.resolve().then(resolver); },
        single() { return Promise.resolve().then(resolver); },
        then(ok, erro) { return Promise.resolve().then(resolver).then(ok, erro); },
      };
      return b;
    },
  };
  return { client, consultas };
}

/* A resposta do Postgres pra uma coluna que não existe (migration pendente). */
export const COLUNA_INEXISTENTE = { data: null, error: { code: '42703', message: 'column profiles.cady_estilo does not exist' } };
