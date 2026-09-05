#!/usr/bin/env node
// Cria os produtos no AbacatePay e imprime os prod_... pra você colar no env.
// Idempotente por externalId via cache local (.abacate-products.json, ignorado
// pelo git): não recria se você rodar de novo.
//
// Uso:  ABACATEPAY_API_KEY=xxx node scripts/abacate-setup-products.mjs
import fs from 'node:fs';

const BASE = 'https://api.abacatepay.com';
const KEY = process.env.ABACATEPAY_API_KEY;
if (!KEY) {
  console.error('Defina ABACATEPAY_API_KEY no ambiente. Ex.: ABACATEPAY_API_KEY=abc_... node scripts/abacate-setup-products.mjs');
  process.exit(1);
}

const CACHE = '.abacate-products.json';
const PRODUCTS = [
  {
    externalId: 'cadence-pro-trimestral',
    envVar: 'ABACATEPAY_PROD_PRO_TRIMESTRAL',
    name: 'Cadence Pro',
    description: 'Acesso ao Cadence — assinatura trimestral',
    price: 8990, // centavos (R$ 89,90)
    currency: 'BRL',
    cycle: 'QUARTERLY',
  },
];

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* sem cache ainda */ }

for (const p of PRODUCTS) {
  if (cache[p.externalId]) {
    console.log(`✓ ${p.externalId} já existe: ${cache[p.externalId]}`);
    continue;
  }
  const res = await fetch(`${BASE}/v2/products/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    // A API real rejeita opcionais como null (schema additionalProperties:false +
    // tipos estritos) — então OMITIMOS o que não tem valor (nada de null).
    body: JSON.stringify({
      externalId: p.externalId,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      ...(p.cycle ? { cycle: p.cycle } : {}),
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success || !json?.data?.id) {
    console.error(`✗ falha em ${p.externalId}: HTTP ${res.status} —`, json?.error || '(sem detalhe)');
    continue;
  }
  cache[p.externalId] = json.data.id;
  console.log(`✓ ${p.externalId} → ${json.data.id}`);
}

fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2));

console.log('\nCole estas variáveis no seu .env.local e na Vercel:');
for (const p of PRODUCTS) {
  if (cache[p.externalId]) console.log(`${p.envVar}=${cache[p.externalId]}`);
}
