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
export function payloadOnboarding(a, extras = {}) {
  return {
    source: 'comecar',
    /* O IDIOMA e a FALA eram perguntados e jogados fora.

       A vitrine de bandeiras (2ª tela) e o teste de fala (7ª) gravavam no
       estado local e nunca saíam de lá: quando a conta nascia, o payload não
       os carregava, e o localStorage era tudo que restava deles. A tela
       pergunta, a pessoa responde, e o dado morria. */
    language: a.idioma || null,
    speechSample: typeof a.fala === 'string' ? a.fala.slice(0, 500) : null,
    // Só existe no cadastro por e-mail (quem entra pelo Google não vê o campo).
    inviteCode: extras.convite ? String(extras.convite).slice(0, 40) : null,
    /* O estado BRUTO, junto com as colunas tipadas. Não é redundância: coluna é
       contrato, e este funil mudou de forma três vezes em duas semanas. Quem
       adicionar uma tela amanhã vai lembrar do campo na tela e pode esquecer a
       coluna — e como a gravação é best-effort, o dado sumiria sem erro
       nenhum. Com o bruto guardado, a coluna pode nascer depois e ser
       preenchida a partir dele. */
    answers: a && typeof a === 'object' ? a : null,
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
