import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/* A MUDANÇA MAIS ARRISCADA DESTA RODADA, FIXADA POR TESTE.

   O middleware e as telas do /v2 trocaram `auth.getUser()` por
   `auth.getClaims()`. O primeiro sai na rede pro servidor de auth em TODA
   requisição (é o que ele promete fazer); o segundo verifica a assinatura do
   JWT aqui mesmo, com WebCrypto, contra o JWKS do projeto. Era ~100ms carimbado
   em cima de cada clique.

   Se o `getClaims()` falhar em verificar um token que é válido, o efeito não é
   "fica lento": é TODO MUNDO DESLOGADO. Então há duas coisas pra provar, e elas
   são independentes:

   1. Que o projeto assina com chave ASSIMÉTRICA. Sem isso o SDK cai de volta
      pro `getUser()` sozinho — seguro, mas sem ganho nenhum. Isso foi conferido
      contra a produção (`/auth/v1/.well-known/jwks.json` devolve uma chave
      ES256) e é o que o último teste deste arquivo repete, quando há rede.

   2. Que ESTA versão do SDK verifica ES256 localmente e devolve as claims. É o
      que este arquivo prova, com um par de chaves próprio: assina um JWT no
      mesmo formato que o Supabase emite e confere que o `getClaims()` o aceita,
      rejeita assinatura trocada e rejeita token vencido — tudo sem rede
      nenhuma (a chave vai por `options.keys`).

   O que o teste NÃO cobre, e é bom estar escrito: um token continua válido até
   vencer, então banir usuário/revogar sessão passa a levar até o tempo de vida
   do access token. O portão de pagamento não depende disso — ele lê
   `paid_emails` fresco a cada requisição. */

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function fazerJwt({ chavePrivada, kid, payload }) {
  const header = { alg: 'ES256', typ: 'JWT', kid };
  const cabeca = b64url(JSON.stringify(header));
  const corpo = b64url(JSON.stringify(payload));
  // `ieee-p1363` = assinatura crua r||s (64 bytes), que é o que o WebCrypto
  // espera. O padrão do Node é DER, e com DER a verificação falha.
  const assinatura = sign('sha256', Buffer.from(`${cabeca}.${corpo}`), {
    key: chavePrivada,
    dsaEncoding: 'ieee-p1363',
  });
  return `${cabeca}.${corpo}.${b64url(assinatura)}`;
}

function parDeChaves() {
  // Sem `encoding`, o Node devolve KeyObject — que é o que o `sign` quer, e o
  // que exporta JWK direto.
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const kid = 'teste-1';
  return {
    chavePrivada: privateKey,
    jwk: { ...jwk, kid, alg: 'ES256', use: 'sig', key_ops: ['verify'], ext: true },
    kid,
  };
}

// Cliente sem sessão nenhuma: passamos o token na mão, então nada aqui toca
// storage, cookie ou rede.
const cliente = () => createClient('https://exemplo.supabase.co', 'chave-anon-de-teste');

const agora = () => Math.floor(Date.now() / 1000);

describe('getClaims verifica o token localmente (o que substituiu o getUser)', () => {
  it('aceita um JWT ES256 bem assinado e devolve sub e email', async () => {
    const { chavePrivada, jwk, kid } = parDeChaves();
    const token = fazerJwt({
      chavePrivada,
      kid,
      payload: { sub: '11111111-2222-3333-4444-555555555555', email: 'pessoa@exemplo.com', iat: agora(), exp: agora() + 3600, role: 'authenticated' },
    });

    const { data, error } = await cliente().auth.getClaims(token, { keys: [jwk] });

    expect(error).toBeNull();
    // É exatamente disto que o middleware e o lib/sessaoServidor vivem.
    expect(data.claims.sub).toBe('11111111-2222-3333-4444-555555555555');
    expect(data.claims.email).toBe('pessoa@exemplo.com');
    expect(data.header.alg).toBe('ES256');
  });

  it('rejeita token assinado por outra chave', async () => {
    const bom = parDeChaves();
    const impostor = parDeChaves();
    // Assinado pelo impostor, mas anunciando o kid da chave boa.
    const token = fazerJwt({
      chavePrivada: impostor.chavePrivada,
      kid: bom.kid,
      payload: { sub: 'invasor', email: 'invasor@exemplo.com', iat: agora(), exp: agora() + 3600 },
    });

    const { data, error } = await cliente().auth.getClaims(token, { keys: [bom.jwk] });

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it('rejeita token vencido', async () => {
    const { chavePrivada, jwk, kid } = parDeChaves();
    const token = fazerJwt({
      chavePrivada,
      kid,
      payload: { sub: 'alguem', email: 'alguem@exemplo.com', iat: agora() - 7200, exp: agora() - 60 },
    });

    const { data, error } = await cliente().auth.getClaims(token, { keys: [jwk] });

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it('rejeita corpo alterado depois de assinado', async () => {
    const { chavePrivada, jwk, kid } = parDeChaves();
    const token = fazerJwt({
      chavePrivada,
      kid,
      payload: { sub: 'dono-legitimo', email: 'dono@exemplo.com', iat: agora(), exp: agora() + 3600 },
    });
    const [cabeca, , assinatura] = token.split('.');
    const corpoTrocado = b64url(JSON.stringify({ sub: 'outra-pessoa', email: 'outra@exemplo.com', iat: agora(), exp: agora() + 3600 }));

    const { data, error } = await cliente().auth.getClaims(`${cabeca}.${corpoTrocado}.${assinatura}`, { keys: [jwk] });

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
});

/* A outra metade da prova: o projeto REALMENTE assina com chave assimétrica.

   Sem isso, o `getClaims()` cai sozinho de volta pro `getUser()` — continua
   correto, mas o ganho de tempo desaparece sem avisar ninguém. Se as chaves do
   projeto forem trocadas por simétricas algum dia, é aqui que se descobre.

   Pula quando não há rede ou variável de ambiente (CI offline, `npm test` no
   avião): a asserção só faz sentido contra o projeto de verdade. */
describe('o projeto assina com chave assimétrica (senão o getClaims não ganha nada)', () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  it.skipIf(!url)('o JWKS do projeto publica uma chave ES256/RS256', async () => {
    let jwks;
    try {
      const r = await fetch(`${url}/auth/v1/.well-known/jwks.json`, { signal: AbortSignal.timeout(8000) });
      jwks = await r.json();
    } catch {
      return; // sem rede: nada a afirmar
    }
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length, 'JWKS vazio = chaves simétricas = getClaims sai na rede').toBeGreaterThan(0);
    expect(jwks.keys.some((k) => k.alg === 'ES256' || k.alg === 'RS256')).toBe(true);
  });
});
