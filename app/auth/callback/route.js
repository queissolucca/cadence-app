import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/* A VOLTA DE TODO LINK QUE CRIA SESSÃO.

   Três fluxos diferentes caem aqui, e eles NÃO chegam do mesmo jeito:

   1. Google (OAuth)          -> ?code=...
   2. Confirmação de cadastro -> ?token_hash=...&type=signup
   3. Recuperação de senha    -> ?token_hash=...&type=recovery

   Esta rota só tratava o primeiro. Quem clicava no link do e-mail chegava sem
   `code`, caía direto no `/auth/auth-error` — e lá a mensagem dizia "tente
   entrar com o Google novamente", que não tem nada a ver com quem acabou de
   confirmar um cadastro. Cadastro por e-mail e recuperação de senha estavam
   quebrados pelos dois lados: não entrava, e o erro mentia sobre o motivo.

   Os dois caminhos existem por um motivo real, não por variação de API:
   `exchangeCodeForSession` precisa do cookie `code-verifier` gravado no
   navegador que ABRIU o fluxo (PKCE). `verifyOtp` não precisa — e é por isso
   que o link do e-mail funciona quando a pessoa abre a caixa de entrada no
   celular tendo se cadastrado no computador, que é o caso comum. */

const TIPOS = new Set(['signup', 'email', 'recovery', 'invite', 'magiclink', 'email_change']);

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  /* O destino só pode ser um caminho DESTE site. `next` vem da URL, e uma URL
     absoluta ali transformaria este endpoint num redirecionador aberto — um
     link de e-mail legítimo levando pra fora. */
  const pedido = searchParams.get('next') || '/v2';
  const next = pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : '/v2';

  const erro = (motivo) =>
    NextResponse.redirect(`${origin}/auth/auth-error?motivo=${encodeURIComponent(motivo)}`);

  // O próprio Supabase pode mandar o erro na URL (link expirado, já usado).
  const erroDeLa = searchParams.get('error_code') || searchParams.get('error');
  if (erroDeLa) return erro(erroDeLa === 'otp_expired' ? 'expirado' : erroDeLa);

  const supabase = createClient();

  // --- link de e-mail (cadastro, recuperação, convite) ---
  const tokenHash = searchParams.get('token_hash');
  const tipo = searchParams.get('type');
  if (tokenHash && TIPOS.has(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // "Token has expired or is invalid" é o caso de longe mais comum: o link
    // só vale uma vez, e abrir duas vezes (ou dias depois) cai aqui.
    return erro(/expired|invalid/i.test(error.message || '') ? 'expirado' : 'link');
  }

  // --- Google, e qualquer fluxo com código PKCE ---
  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    /* Falhou quase sempre porque o cookie `code-verifier` não está NESTE
       navegador — o fluxo começou em outro. Vale distinguir: a pessoa não fez
       nada de errado, ela só abriu o link em outro lugar. */
    return erro('outro_navegador');
  }

  return erro('sem_token');
}
