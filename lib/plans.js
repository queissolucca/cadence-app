// Mapa plano → produto do AbacatePay. Preço, ciclo e prodId vivem SÓ no servidor
// — o cliente manda apenas o `planId`. O prodId (prod_...) vem de env, preenchida
// depois de rodar scripts/abacate-setup-products.mjs.
export const PLANS = {
  'pro-trimestral': {
    externalId: 'cadence-pro-trimestral',
    name: 'Cadence Pro',
    description: 'Acesso ao Cadence — assinatura trimestral',
    price: 8990, // centavos (R$ 89,90)
    currency: 'BRL',
    cycle: 'QUARTERLY', // renova a cada 3 meses
    get prodId() { return process.env.ABACATEPAY_PROD_PRO_TRIMESTRAL || ''; },
  },
};

export function getPlan(id) {
  return Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null;
}
