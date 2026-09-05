// Mapa plano → produto do AbacatePay. Preço, ciclo e prodId vivem SÓ no servidor
// — o cliente manda apenas o `planId`. O prodId (prod_...) vem de env, preenchida
// depois de rodar scripts/abacate-setup-products.mjs.
export const PLANS = {
  'pro-trimestral': {
    externalId: 'cadence-pro-3m',
    name: 'Cadence Pro',
    description: 'Acesso ao Cadence — 3 meses',
    price: 8990, // centavos (R$ 89,90)
    currency: 'BRL',
    // Compra AVULSA (sem cycle): o acesso de 3 meses é controlado por
    // paid_emails.expires_at; renovação = re-pagar. Sem ciclo, PIX é normal
    // (a conta não tem "PIX Automático"/recorrente).
    cycle: null,
    get prodId() { return process.env.ABACATEPAY_PROD_PRO_TRIMESTRAL || ''; },
  },
};

export function getPlan(id) {
  return Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null;
}
