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
    /* Quantos DIAS de acesso a compra dá. Estava implícito no nome de uma
       função do webhook (`threeMonthsFrom`), o que funcionava enquanto existia
       um plano só — e viraria 3 meses por R$ 19,90 no instante em que
       existisse um segundo. */
    dias: 90,
    get prodId() { return process.env.ABACATEPAY_PROD_PRO_TRIMESTRAL || ''; },
  },

  /* O semanal é a porta de entrada, não a oferta boa: R$ 2,84 por dia contra
     R$ 0,99 do trimestral. Ele existe pra quem não quer decidir três meses de
     uma vez — e a diferença por dia, à vista, é o que faz a maioria escolher
     o outro. */
  'pro-semanal': {
    externalId: 'cadence-pro-7d',
    name: 'Cadence Pro — semana',
    description: 'Acesso ao Cadence — 7 dias',
    price: 1990, // centavos (R$ 19,90)
    currency: 'BRL',
    cycle: null,
    dias: 7,
    get prodId() { return process.env.ABACATEPAY_PROD_PRO_SEMANAL || ''; },
  },
};

/* Preço por dia, em centavos, pro rótulo das ofertas. Calculado e não escrito
   à mão porque um preço que muda sem o "por dia" mudar junto é uma promessa
   falsa na tela — e ninguém lembra de atualizar os dois.

   FLOOR, e não round. 8990/90 = 99,888…, que arredondado vira R$ 1,00 — e o
   resto do produto (o card de preço, o paywall) diz R$ 0,99 em todo lugar.
   Dois números para o mesmo plano na mesma sessão é o tipo de detalhe que faz
   a pessoa parar e reler em vez de comprar. Floor também nunca INFLA o preço
   por dia, que é o lado certo pra errar. */
export function centavosPorDia(plan) {
  return plan && plan.dias ? Math.floor(plan.price / plan.dias) : null;
}

export function getPlan(id) {
  return Object.prototype.hasOwnProperty.call(PLANS, id) ? PLANS[id] : null;
}
