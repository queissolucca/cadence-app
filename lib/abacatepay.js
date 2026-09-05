// Cliente HTTP do AbacatePay (API v2). SERVER-ONLY — nunca importar em código
// que roda no browser (a API key é secreta). Usa fetch nativo, sem dependência
// nova. A key é lida de process.env na hora da chamada e lança se faltar.
const BASE = 'https://api.abacatepay.com';
const TIMEOUT_MS = 15000;

function apiKey() {
  const k = process.env.ABACATEPAY_API_KEY;
  if (!k) throw new AbacateError('ABACATEPAY_API_KEY ausente no ambiente');
  return k;
}

export class AbacateError extends Error {
  constructor(message, { status, apiError } = {}) {
    super(message);
    this.name = 'AbacateError';
    this.status = status;
    this.apiError = apiError;
  }
}

async function once(path, { method = 'GET', body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
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

// Uma retentativa APENAS pra erro de rede ou 5xx. Nunca pra 4xx (erro do
// cliente/gateway não melhora repetindo).
async function request(path, opts = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let out;
    try {
      out = await once(path, opts);
    } catch (e) {
      if (attempt < 2) { await sleep(400); continue; }
      throw new AbacateError('Falha de rede ao falar com o AbacatePay');
    }
    const { res, json } = out;
    if (res.status >= 500 && attempt < 2) { await sleep(400); continue; }
    if (!res.ok) {
      throw new AbacateError(`AbacatePay respondeu HTTP ${res.status}`, { status: res.status, apiError: json && json.error });
    }
    // Envelope { success, error, data }.
    if (json && json.success === false) {
      throw new AbacateError(json.error || 'Requisição rejeitada pelo AbacatePay', { status: res.status, apiError: json.error });
    }
    return json ? json.data : null;
  }
  // inalcançável
  throw new AbacateError('Falha inesperada no AbacatePay');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// POST /v2/products/create → data.id (prod_...)
export function createProduct(input) {
  return request('/v2/products/create', { method: 'POST', body: input });
}

// POST /v2/checkouts/create → data { id (bill_...), url, ... }
export function createCheckout(input) {
  return request('/v2/checkouts/create', { method: 'POST', body: input });
}
