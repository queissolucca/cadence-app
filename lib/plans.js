// Os planos. Preço, ciclo e duração vivem SÓ aqui — o cliente manda apenas o
// `planId`, e o servidor monta a cobrança a partir disto.
//
// O checkout do Asaas recebe o item inline (nome + valor), então não existe
// produto cadastrado no gateway: mudar o preço é mudar `price` aqui e publicar.
// O `prodId` que ainda aparece abaixo é do AbacatePay, mantido só enquanto o
// webhook antigo recebe estornos de compras feitas lá.
export const PLANS = {
  'pro-trimestral': {
    externalId: 'cadence-pro-3m',
    name: 'Cadence Pro',
    description: 'Acesso ao Cadence — 3 meses',
    price: 8990, // centavos (R$ 89,90)
    currency: 'BRL',
    // Compra AVULSA (sem cycle): o acesso de 3 meses é controlado por
    // paid_emails.expires_at; renovação = re-pagar. Pix ou cartão (até 8x).
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
    /* FORA DE VENDA desde a troca pro Asaas: o mensal ocupou o lugar de "porta
       de entrada". Continua no mapa porque pedidos antigos em `orders` dizem
       'pro-semanal', e o webhook do AbacatePay lê `dias` daqui pra um estorno
       tardio. Sair do mapa faria esses pedidos caírem no padrão de 90 dias. */
    vendavel: false,
    get prodId() { return process.env.ABACATEPAY_PROD_PRO_SEMANAL || ''; },
  },

  /* O MENSAL É ASSINATURA, NÃO COMPRA.

     Renova sozinho: no cartão o Asaas cobra todo mês; no Pix Automático o
     banco da pessoa debita todo mês, depois de uma autorização única no app.
     Cada cobrança paga estende o acesso até o vencimento seguinte (+ folga) —
     ver `validadeDaAssinatura` em lib/webhookAsaas.js.

     PREÇO PROVISÓRIO: R$ 39,90 foi escolhido por quem escreveu o código, não
     pelo dono. Fica entre o semanal (R$ 2,84/dia) e o trimestral (R$ 0,99/dia)
     — R$ 1,33/dia. Trocar aqui troca em todo lugar (popup, checkout, Pix
     Automático); as assinaturas JÁ criadas guardam o valor antigo no Asaas. */
  'pro-mensal': {
    externalId: 'cadence-pro-mensal',
    name: 'Cadence Pro — mensal',
    description: 'Acesso ao Cadence — renova todo mês',
    price: 3990, // centavos (R$ 39,90)
    currency: 'BRL',
    cycle: 'MONTHLY',
    // Só pro rótulo "por dia". A validade de verdade é ancorada no calendário
    // de cobrança, não em 30 dias corridos.
    dias: 30,
  },
};

/* Pode ser comprado hoje? O mapa guarda também os planos aposentados. */
export function planoVendavel(id) {
  const p = getPlan(id);
  return !!p && p.vendavel !== false;
}

export const ehAssinatura = (plan) => !!plan?.cycle;

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
