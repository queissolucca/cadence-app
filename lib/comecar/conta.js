'use client';

import { createClient } from '../supabase/client';
import { payloadOnboarding } from './paraApi';

/* Criar conta e pagar, no fim das 33 telas.

   A ordem aqui é o inverso da do funil antigo, e isso não é detalhe: lá a conta
   vem primeiro (/login → /onboarding → /pagamento); aqui a pessoa responde 28
   telas anônima e só então cria a conta. Tudo o que ela respondeu vive no
   localStorage até este momento, e é despejado no banco assim que a sessão
   nasce.

   O ponto de falha que isso cria: o middleware manda qualquer pessoa logada sem
   `profiles.onboarded_at` pro /onboarding antigo. Se a conta nascesse e o POST
   das respostas falhasse, ela cairia nas 6 perguntas depois de ter respondido
   28. Por isso `concluir` só segue pro checkout quando o /api/onboarding
   confirma — e, se falhar, a tela mostra erro e deixa tentar de novo, sem sair
   do lugar. */

// Marca que saímos pro Google e vamos voltar: o OAuth tira a pessoa do site, e
// no retorno a App precisa saber que era pra retomar na tela de conta em vez de
// recomeçar no splash. As respostas em si sobrevivem sozinhas (localStorage).
export const RETOMAR = 'cadence.comecar.retomar';

export const marcarRetomada = () => {
  try { localStorage.setItem(RETOMAR, '1'); } catch { /* storage bloqueado */ }
};
export const limparRetomada = () => {
  try { localStorage.removeItem(RETOMAR); } catch { /* storage bloqueado */ }
};
export const temRetomada = () => {
  try { return localStorage.getItem(RETOMAR) === '1'; } catch { return false; }
};

export class ErroEtapa extends Error {
  constructor(etapa, msg) {
    super(msg);
    this.etapa = etapa;
  }
}

const MENSAGENS = {
  onboarding: 'Não consegui salvar suas respostas agora. Tenta de novo.',
  checkout: 'Não consegui abrir o pagamento agora. Tenta de novo.',
  sessao: 'Sua sessão expirou. Cria a conta de novo, suas respostas continuam aqui.',
  rede: 'Sem conexão. Tenta de novo.',
};
export const mensagemDe = (e) => MENSAGENS[e?.etapa] || MENSAGENS.rede;

/* Com a sessão já existindo: grava as respostas, registra o aceite dos termos e
   abre o checkout. Mesma sequência para e-mail e para Google. Não retorna — sai
   da página pro AbacatePay. */
export async function concluir(a) {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadOnboarding(a)),
  });
  if (res.status === 401) throw new ErroEtapa('sessao');
  if (!res.ok) throw new ErroEtapa('onboarding');

  // Aceite dos termos é best-effort, igual ao funil antigo: não vale travar o
  // pagamento de quem já respondeu tudo por causa de um registro auxiliar.
  fetch('/api/terms/accept', { method: 'POST' }).catch(() => {});

  const ck = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'pro-trimestral' }),
  });
  const dados = await ck.json().catch(() => ({}));
  if (!ck.ok || !dados.url) throw new ErroEtapa('checkout');

  limparRetomada();
  window.location.href = dados.url;
}

export async function sessaoAtual() {
  try {
    const { data } = await createClient().auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/* Cadastro por e-mail. Devolve { session } — quando o projeto exige confirmação
   por e-mail, `session` vem null e quem chama tem que parar e pedir a
   confirmação, porque sem sessão não dá pra gravar nada nem cobrar. */
export async function criarConta({ nome, email, senha }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/comecar`,
      data: { full_name: nome.trim() },
    },
  });
  if (error) throw error;
  return { session: data.session };
}

export async function entrarComSenha({ email, senha }) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

/* Google. Sai da página; o retorno cai em /auth/callback, que devolve pra
   /comecar — e não pra /v2, que mandaria a pessoa direto pro questionário
   antigo (ela ainda não tem onboarded_at neste ponto). */
export async function entrarComGoogle() {
  marcarRetomada();
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback?next=/comecar` },
  });
  if (error) {
    limparRetomada();
    throw error;
  }
}
