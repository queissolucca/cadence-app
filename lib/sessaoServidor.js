import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from './supabase/server';
import { identidadeDe, H_UID, H_EMAIL } from './supabase/middleware';
import { dayKeySP } from './dates';

/* QUEM É O USUÁRIO, E OS DADOS QUE TODA TELA DO /v2 PRECISA — UMA VEZ POR
   REQUISIÇÃO.

   O problema que isto resolve: abrir /v2/ajustes fazia doze idas e voltas à
   rede em fila indiana antes do primeiro pixel. A conta era

     middleware:            getUser + (perfil ‖ paid_emails)
     app/v2/layout:         getUser + perfil(theme)
     app/v2/(app)/layout:   getUser + (perfil ‖ sessions)
     a página:              getUser + perfil + rpc senha + sessions
                            + unit_progress + review_saved

   — quatro `getUser()`, quatro leituras da MESMA linha de `profiles` e duas
   da MESMA janela de `sessions`. Layout aninhado no App Router é assíncrono e
   só libera o filho depois de resolver, então essas esperas SOMAM em vez de
   acontecerem juntas.

   Duas ideias cortam quase tudo:

   1. `getClaims()` no lugar de `getUser()`. O `getUser()` sai na rede pro
      servidor de auth TODA vez, de propósito, pra revalidar o token. Este
      projeto assina o JWT com chave assimétrica (ES256 — confirmado no
      /auth/v1/.well-known/jwks.json), e aí o `getClaims()` verifica a
      assinatura AQUI, com WebCrypto, contra o JWKS que o SDK guarda em memória
      global. É a mesma garantia criptográfica, sem a ida à rede.

      O que se perde: um token continua válido até expirar, então banir um
      usuário ou revogar uma sessão leva até o tempo de vida do access token
      pra fazer efeito (o `getUser()` cortaria na hora). O portão de PAGAMENTO
      não é afetado — ele lê `paid_emails` fresco a cada requisição, aqui e no
      middleware. Trocado com essa consciência: a espera de rede era paga por
      todo mundo, a toda navegação, e a revogação imediata não é requisito
      deste produto.

   2. `cache()` do React, que memoiza por requisição. As quatro leituras de
      `profiles` viram uma, as duas de `sessions` viram uma, e os quatro
      `getClaims()` viram um.

   As colunas de `perfilV2` são a UNIÃO do que layout e páginas pedem: uma
   consulta gorda de uma linha custa o mesmo que uma magra (é uma ida e volta),
   então pedir de uma vez é sempre melhor do que pedir duas vezes. */

/* Identidade verificada, sem ida à rede. Devolve null pra quem não tem sessão.
   `criadoEm` NÃO vem daqui: não está no JWT. Quem precisa dele lê
   `profiles.created_at` (mesma data, já vem no perfilV2). */
export const identidade = cache(async () => {
  /* O middleware já resolveu isto, e verificou a assinatura pra fazê-lo. Ler o
     cabeçalho que ele deixou é mais que economia de tempo: enquanto esta função
     perguntava ao Supabase por conta própria, ela podia disparar uma RENOVAÇÃO
     de token de dentro de um Server Component — onde a gravação do cookie é
     engolida pelo Next. O refresh token é rotativo, então a rotação acontecia
     no servidor e o navegador ficava com um que já não valia. Deslogado no meio
     da conversa, sem nada no log.

     Os cabeçalhos são reescritos pelo middleware em toda requisição (ele apaga
     antes de gravar), então não há como forjá-los de fora. */
  try {
    const h = headers();
    const id = h.get(H_UID);
    if (id) return { id, email: h.get(H_EMAIL) || '' };
  } catch {
    /* fora de um contexto de requisição: cai no caminho de baixo */
  }

  /* Sem cabeçalho: ou o middleware não cobriu esta rota, ou não conseguiu
     confirmar a sessão. Perguntar aqui é o último recurso — e blindado do mesmo
     jeito, porque o getClaims RELANÇA o que não for erro de auth e isso viraria
     "Application error" na tela. */
  return identidadeDe(createClient());
});

/* A linha de `profiles` do usuário logado. Uma só por requisição, com todas as
   colunas que o /v2 usa em algum lugar.

   Colunas novas entram em degraus: `select('*')` traria tudo, mas também
   traria colunas que ninguém pediu (e o payload de RSC paga por elas). A lista
   explícita é o contrato — e como uma coluna que falta faz o Postgres devolver
   erro no select INTEIRO, há um segundo tiro só com as colunas do 0001, pra
   uma migration pendente não apagar o nome da pessoa da tela. */
const DEGRAUS_PERFIL = [
  // tudo; `streak_max` é da 0013 e o resto do código já a tratava como opcional
  'full_name, avatar_url, theme, weekly_cadence_target, streak_count, streak_max, created_at',
  // o que as telas de hoje já leem sem nenhuma proteção
  'full_name, avatar_url, theme, weekly_cadence_target, streak_count, created_at',
  // o 0001, que existe desde sempre
  'full_name, avatar_url, created_at',
];

export const perfilV2 = cache(async () => {
  const eu = await identidade();
  if (!eu) return null;
  const supabase = createClient();
  for (const colunas of DEGRAUS_PERFIL) {
    const r = await supabase.from('profiles').select(colunas).eq('id', eu.id).maybeSingle();
    if (!r.error) return r.data || null;
  }
  return null;
});

/* Os dias em que houve sessão, como Set de chaves 'YYYY-MM-DD' (fuso de SP).

   A janela é a MAIOR que alguma tela pede (o calendário da Início navega 2026
   e 2027); o cálculo de streak do layout e do Perfil olhava só 120 dias, e um
   superconjunto dá exatamente o mesmo streak, porque `streakFromDayKeys` anda
   pra trás a partir de hoje. O payload é minúsculo: só datas, e desduplicadas
   pra um Set.

   Devolve também a lista crua de `started_at`, que o Perfil usa pra contar
   sessões da semana. */
export const diasComSessao = cache(async () => {
  const eu = await identidade();
  if (!eu) return { dias: new Set(), inicios: [] };
  const supabase = createClient();
  const { data } = await supabase
    .from('sessions')
    .select('started_at')
    .eq('user_id', eu.id)
    .gte('started_at', '2026-01-01T00:00:00Z')
    .lte('started_at', '2028-01-01T00:00:00Z');
  const inicios = (data || []).map((s) => s.started_at);
  return { dias: new Set(inicios.map((iso) => dayKeySP(new Date(iso)))), inicios };
});
