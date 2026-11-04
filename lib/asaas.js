// Cliente HTTP do Asaas (API v3). SERVER-ONLY — nunca importar em código que
// roda no browser (a API key é secreta). Usa fetch nativo, sem dependência
// nova. A key é lida de process.env na hora da chamada e lança se faltar.
//
// Doc: https://docs.asaas.com (as páginas têm versão .md — foi por elas que
// este arquivo foi escrito, em 2026-11).
const TIMEOUT_MS = 15000;

/* O AMBIENTE VEM DA PRÓPRIA CHAVE.

   O Asaas tem duas bases (sandbox e produção) e chaves diferentes pra cada uma;
   chave de um ambiente na base do outro dá 401 `invalid_environment`. Em vez de
   uma segunda variável que pode divergir da chave, o prefixo decide:
   `$aact_prod_` é produção, o resto (`$aact_hmlg_`) é sandbox. */
export function ambienteDaChave(chave) {
  return String(chave || '').startsWith('$aact_prod_') ? 'producao' : 'sandbox';
}

const BASES = {
  producao: { api: 'https://api.asaas.com/v3', site: 'https://asaas.com' },
  sandbox: { api: 'https://api-sandbox.asaas.com/v3', site: 'https://sandbox.asaas.com' },
};

function apiKey() {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new AsaasError('ASAAS_API_KEY ausente no ambiente');
  return k;
}

export function ambiente() {
  return ambienteDaChave(process.env.ASAAS_API_KEY);
}

export class AsaasError extends Error {
  constructor(message, { status, erros } = {}) {
    super(message);
    this.name = 'AsaasError';
    this.status = status;
    // [{ code, description }] — o formato de erro de toda a API v3.
    this.erros = erros || [];
  }
}

async function once(path, { method = 'GET', body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASES[ambiente()].api + path, {
      method,
      headers: {
        access_token: apiKey(),
        // Obrigatório pra contas criadas a partir de 13/06/2024.
        'User-Agent': 'cadence-heycady',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* resposta não-JSON */ }
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

// Uma retentativa APENAS pra erro de rede ou 5xx — e só em leitura. Repetir um
// POST que o Asaas pode ter processado antes de cair criaria duas cobranças.
async function request(path, opts = {}) {
  const podeRepetir = !opts.method || opts.method === 'GET';
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    let out;
    try {
      out = await once(path, opts);
    } catch {
      if (podeRepetir && tentativa < 2) { await sleep(400); continue; }
      throw new AsaasError('Falha de rede ao falar com o Asaas');
    }
    const { res, json } = out;
    if (res.status >= 500 && podeRepetir && tentativa < 2) { await sleep(400); continue; }
    if (!res.ok) {
      const erros = Array.isArray(json?.errors) ? json.errors : [];
      const texto = erros.map((e) => e?.description || e?.code).filter(Boolean).join('; ');
      throw new AsaasError(texto || `Asaas respondeu HTTP ${res.status}`, { status: res.status, erros });
    }
    return json;
  }
  throw new AsaasError('Falha inesperada no Asaas');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const qs = (params) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
};

/* ------------------------------- checkout ------------------------------- */

// POST /v3/checkouts → { id, link, ... }
export function criarCheckout(corpo) {
  return request('/checkouts', { method: 'POST', body: corpo });
}

/* A URL que o pagador abre. A resposta traz `link`; quando não traz, a doc
   manda montar a partir do id — no domínio do MESMO ambiente da chave, senão
   um checkout de sandbox abriria na página de produção (e vice-versa). */
export function linkDoCheckout(checkout) {
  if (checkout?.link) return checkout.link;
  if (!checkout?.id) return null;
  return `${BASES[ambiente()].site}/checkoutSession/show?id=${encodeURIComponent(checkout.id)}`;
}

/* ------------------------------- clientes ------------------------------- */

export function criarCliente(dados) {
  return request('/customers', { method: 'POST', body: dados });
}

export async function listarClientes(filtros) {
  const r = await request(`/customers${qs({ limit: 20, ...filtros })}`);
  return Array.isArray(r?.data) ? r.data : [];
}

export function buscarCliente(id) {
  return request(`/customers/${encodeURIComponent(id)}`);
}

/* ------------------------------ assinaturas ----------------------------- */

export async function listarAssinaturas(filtros) {
  const r = await request(`/subscriptions${qs({ limit: 20, ...filtros })}`);
  return Array.isArray(r?.data) ? r.data : [];
}

export function buscarAssinatura(id) {
  return request(`/subscriptions/${encodeURIComponent(id)}`);
}

export function removerAssinatura(id) {
  return request(`/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ---------------------------- Pix Automático ---------------------------- */

// POST /v3/pix/automatic/authorizations → { id, payload, encodedImage, ... }
export function criarAutorizacaoPix(corpo) {
  return request('/pix/automatic/authorizations', { method: 'POST', body: corpo });
}

export async function listarAutorizacoesPix(filtros) {
  const r = await request(`/pix/automatic/authorizations${qs({ limit: 20, ...filtros })}`);
  return Array.isArray(r?.data) ? r.data : [];
}

export function cancelarAutorizacaoPix(id) {
  return request(`/pix/automatic/authorizations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
