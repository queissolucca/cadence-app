// Cadastra (ou atualiza) o webhook do Cadence no Asaas, com os eventos certos.
//
// Uso (aspas SIMPLES na chave: ela começa com $ e o shell a comeria):
//   ASAAS_API_KEY='$aact_prod_...' node scripts/asaas-setup.mjs --email voce@exemplo.com
//
// Opções:
//   --email  e-mail que o Asaas avisa quando a fila do webhook trava (obrigatório)
//   --url    destino (padrão: https://heycady.com/api/webhooks/asaas)
// Se ASAAS_WEBHOOK_TOKEN estiver no ambiente, ele é usado; senão um token novo
// é gerado e impresso UMA vez — cole-o na Vercel como ASAAS_WEBHOOK_TOKEN.
//
// Rodar de novo é seguro: acha o webhook pela URL e atualiza em vez de duplicar.
import { randomBytes } from 'node:crypto';

/* A MESMA lista de EVENTOS_ASSINADOS em lib/webhookAsaas.js. Repetida aqui
   porque este script roda em Node puro, que não resolve os imports sem
   extensão do Next — e tests/asaasSetup.test.js falha se as duas divergirem. */
const EVENTOS = [
  'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED',
  'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED',
  'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED',
  'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED',
  'CHECKOUT_PAID', 'SUBSCRIPTION_CREATED', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
  'PAYMENT_OVERDUE', 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED', 'PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_REFUSED',
];

const arg = (nome) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 ? process.argv[i + 1] : null;
};

const KEY = process.env.ASAAS_API_KEY;
if (!KEY) {
  console.error("Defina ASAAS_API_KEY. Ex.: ASAAS_API_KEY='$aact_prod_...' node scripts/asaas-setup.mjs --email voce@exemplo.com");
  process.exit(1);
}
const email = arg('email');
if (!email) {
  console.error('Falta --email (o Asaas avisa por ele quando o webhook falhar).');
  process.exit(1);
}
const url = arg('url') || 'https://heycady.com/api/webhooks/asaas';
const prod = KEY.startsWith('$aact_prod_');
const BASE = prod ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

let token = process.env.ASAAS_WEBHOOK_TOKEN;
const gerado = !token;
if (gerado) token = randomBytes(32).toString('base64url'); // 43 caracteres
if (token.length < 32 || /\s/.test(token)) {
  console.error('ASAAS_WEBHOOK_TOKEN precisa ter 32+ caracteres e nenhum espaço.');
  process.exit(1);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { access_token: KEY, 'User-Agent': 'cadence-heycady', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const erros = (json?.errors || []).map((e) => e.description || e.code).join('; ');
    throw new Error(`${method} ${path} → HTTP ${res.status} ${erros}`);
  }
  return json;
}

const corpo = {
  name: 'Cadence (heycady.com)',
  url,
  email,
  enabled: true,
  interrupted: false,
  apiVersion: 3,
  authToken: token,
  // Em ordem: o vínculo (CHECKOUT_PAID / SUBSCRIPTION_CREATED) chega antes da
  // cobrança do mês seguinte que depende dele.
  sendType: 'SEQUENTIALLY',
  events: EVENTOS,
};

console.log(`Ambiente: ${prod ? 'PRODUÇÃO' : 'sandbox'}  ·  destino: ${url}`);

const lista = await api('/webhooks?limit=100');
const existente = (lista?.data || []).find((w) => w.url === url);
const salvo = existente
  ? await api(`/webhooks/${existente.id}`, { method: 'PUT', body: corpo })
  : await api('/webhooks', { method: 'POST', body: corpo });

console.log(`${existente ? 'Atualizado' : 'Criado'}: webhook ${salvo.id} com ${EVENTOS.length} eventos.`);
if (gerado) {
  console.log('\nToken novo do webhook (aparece só agora). Na Vercel → Settings → Environment Variables:');
  console.log('  Nome:  ASAAS_WEBHOOK_TOKEN   (Sensitive, ambiente Production)');
  console.log(`  Valor: ${token}`);
  console.log('Depois, faça um redeploy pra variável valer.');
} else {
  console.log('Token: o mesmo de ASAAS_WEBHOOK_TOKEN que você passou.');
}
