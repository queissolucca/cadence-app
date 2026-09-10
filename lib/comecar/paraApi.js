/* Tradução entre o estado local das 33 telas e o que o banco espera.

   As telas guardam códigos curtos ('manha', '-10', 'zero') porque é o que o
   componente precisa pra marcar a opção escolhida. O banco recebe o rótulo
   legível, e não o código, por dois motivos: o texto vai direto pra memória da
   Cady (`Melhor horário pra praticar: De manhã` lê; `: manha` não), e daqui a
   seis meses ninguém vai lembrar o que '-10' queria dizer numa consulta.

   Deliberadamente NÃO reescrevo as respostas nas opções do funil antigo. Seria
   bom pra comparar as duas coortes na mesma coluna, mas 'Prova ou certificação'
   não tem equivalente lá — forçar viraria dado errado. Quem separa as coortes é
   a coluna `source`. */

const NIVEL = {
  zero: 'Começando do zero — quase nenhuma palavra.',
  basico: 'Entendo, mas não falo.',
  medio: 'Falo travando — me viro, mas penso demais.',
  avancado: 'Falo bem — quero soltar e ganhar naturalidade.',
};

const OBJETIVO = {
  Viagem: 'Viajar sem depender de ninguém.',
  Carreira: 'Trabalho e carreira.',
  Conversar: 'Conversar sem travar.',
  Prova: 'Prova ou certificação.',
};

const BLOQUEIO = {
  'Vergonha de errar': 'Vergonha de errar.',
  'Falta de repertório': 'Não sei o que responder.',
  'Falta de prática': 'Não tenho com quem praticar.',
  'Congelo na hora': 'Congelo na hora H.',
};

const HOJE = {
  0: 'Zero — faz tempo que não abro a boca',
  '0': 'Zero — faz tempo que não abro a boca',
  '-10': 'Menos de 10 minutos por dia',
  '10-60': 'Entre 10 e 60 minutos por dia',
  '60+': 'Mais de 1 hora por dia',
};

const PRAZO = { 1: '1 mês', 3: '3 meses', 6: '6 meses' };

const HORARIO = {
  manha: 'De manhã',
  almoco: 'No almoço',
  noite: 'À noite',
  livre: 'Sem hora fixa',
};

const AUDIO = {
  sempre: 'Pode falar sempre',
  exercicios: 'Só nos exercícios',
  mudo: 'Prefiro no silêncio',
};

const rotulo = (mapa, v) => (v == null ? null : mapa[v] || String(v));

/* O corpo que /api/onboarding espera. `reasons` e `challenges` são arrays lá
   (o funil antigo é múltipla escolha); aqui cada um é escolha única, então vai
   um array de um item só — mesma coluna, mesma forma. */
export function payloadOnboarding(a) {
  return {
    source: 'comecar',
    level: rotulo(NIVEL, a.nivel),
    reasons: a.objetivo ? [rotulo(OBJETIVO, a.objetivo)] : [],
    challenges: a.bloqueio ? [rotulo(BLOQUEIO, a.bloqueio)] : [],
    dailyGoal: a.min ? `${a.min} minutos / dia` : null,
    audioPref: rotulo(AUDIO, a.audio),
    speaksToday: rotulo(HOJE, a.hoje),
    deadline: rotulo(PRAZO, a.prazo),
    bestTime: rotulo(HORARIO, a.horario),
    topics: Array.isArray(a.temas) ? a.temas : [],
    tone: a.tom || null,
  };
}

/* As telas que o /api/onboarding exige pra marcar onboarded_at. Se faltar
   alguma, o POST volta 400 e a pessoa acabaria mandada pro questionário
   antigo — melhor descobrir antes de criar a conta. */
export function respostasCompletas(a) {
  return !!(a.nivel && a.objetivo && a.bloqueio && a.min);
}
