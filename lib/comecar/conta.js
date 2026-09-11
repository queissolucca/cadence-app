'use client';

import { payloadOnboarding } from './paraApi';

/* O SDK DO SUPABASE ENTRA SÓ QUANDO ALGUÉM VAI USAR CONTA.

   Este módulo é importado pela App das 33 telas — mas só por causa de
   `temRetomada`, que é três linhas de localStorage. Com o `import` normal do
   cliente aqui no topo, o pacote inteiro do Supabase (~55 kB comprimidos, ~190
   kB de JavaScript pra interpretar) entrava no primeiro carregamento do site:
   todo mundo que abria cadenceenglish.app baixava e executava o SDK de
   autenticação antes de ver a primeira tela — pra uma tela de cadastro que está
   27 toques à frente.

   Todas as funções que precisam dele já são `async` e só rodam depois de uma
   ação da pessoa, então trocar por `import()` sob demanda não muda nada no
   comportamento. A promessa é guardada porque o cliente é singleton: duas
   instâncias do cliente de auth no mesmo documento disputam o mesmo storage. */
let promessaCliente = null;
function cliente() {
  if (!promessaCliente) {
    promessaCliente = import('../supabase/client').then((m) => m.createClient());
  }
  return promessaCliente;
}

// Deixa a App puxar o pedaço quando a thread estiver livre, sem esperar por ele.
export const aquecerConta = () => { cliente(); };

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

/* Com a sessão já existindo: grava as respostas das 33 telas e registra o
   aceite dos termos. É o fecho do onboarding — o pagamento vem depois, numa
   tela própria.

   O aceite é best-effort de propósito: um registro auxiliar não pode travar
   quem já respondeu tudo. As respostas, não: se elas falham, a pessoa fica sem
   `profiles.onboarded_at` e o middleware a manda pro questionário antigo — daí
   o erro subir e a tela deixar tentar de novo. */
export async function salvarRespostas(a, extras = {}) {
  const res = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadOnboarding(a, extras)),
  });
  if (res.status === 401) throw new ErroEtapa('sessao');
  if (!res.ok) throw new ErroEtapa('onboarding');
  fetch('/api/terms/accept', { method: 'POST' }).catch(() => {});
  limparRetomada();
}

/* Abre o checkout do AbacatePay. Não retorna — sai da página.

   Exige sessão: é ela que amarra o pagamento ao usuário. Um checkout aberto sem
   conta volta anônimo, e o acesso não chega em ninguém. */
export async function abrirCheckout() {
  const ck = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'pro-trimestral' }),
  });
  if (ck.status === 401) throw new ErroEtapa('sessao');
  const dados = await ck.json().catch(() => ({}));
  if (!ck.ok || !dados.url) throw new ErroEtapa('checkout');
  window.location.href = dados.url;
}

export async function sessaoAtual() {
  try {
    const supabase = await cliente();
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/* Cadastro por e-mail. Devolve { session } — quando o projeto exige confirmação
   por e-mail, `session` vem null e quem chama tem que parar e pedir a
   confirmação, porque sem sessão não dá pra gravar nada nem cobrar. */
export async function criarConta({ nome, sobrenome, email, senha, convite }) {
  const supabase = await cliente();
  const completo = [nome, sobrenome].map(x => (x || '').trim()).filter(Boolean).join(' ');
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      /* Direto pro caixa. Antes voltava pro /comecar, onde a tela de conta
         lia o localStorage e mandava as respostas — o que fazia a pessoa
         reabrir o fluxo todo só pra ser empurrada adiante. Agora ela confirma
         o e-mail e cai na cobrança; quem manda as respostas é o /pagamento
         (app/pagamento/EnviaRespostas.js), com os mesmos dados do mesmo
         localStorage. */
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/pagamento`,
      // O código de convite vai nos metadados do usuário (auth.users), e não
      // numa coluna nova: assim ele é gravado sem exigir migration, e continua
      // consultável pelo painel do Supabase. Se um dia virar relatório, aí sim
      // vale uma coluna própria.
      data: {
        full_name: completo,
        first_name: (nome || '').trim(),
        last_name: (sobrenome || '').trim(),
        ...(convite ? { invite_code: convite.trim().slice(0, 40) } : {}),
      },
    },
  });
  if (error) throw error;
  return { session: data.session };
}

export async function entrarComSenha({ email, senha }) {
  const supabase = await cliente();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

async function google(destino) {
  const supabase = await cliente();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${destino}` },
  });
  if (error) throw error;
}

/* Cadastro pelo Google, no fim das 33 telas. Sai da página; o retorno cai em
   /auth/callback, que devolve pra /comecar — e não pra /v2, que mandaria a
   pessoa direto pro questionário antigo (ela ainda não tem onboarded_at neste
   ponto). A marca no localStorage é o que faz a App retomar na tela de conta em
   vez de recomeçar no splash. */
export async function entrarComGoogle() {
  marcarRetomada();
  try {
    await google('/comecar');
  } catch (e) {
    limparRetomada();
    throw e;
  }
}

/* Google de quem JÁ tem conta ("já tenho conta · entrar"). Vai pro /v2 e não
   marca retomada — de propósito. Com a marca, a volta cairia na tela de conta e
   dispararia o `concluir`, que sobrescreveria as respostas antigas da pessoa e
   abriria um checkout que ela talvez nem precise. Quem decide o passo certo
   aqui é o middleware. */
export async function entrarComGoogleExistente() {
  limparRetomada();
  await google('/v2');
}
