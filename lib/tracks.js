// Biblioteca estática de cenários — parametrizada por trilha/estágio.
// Cenários nunca são gerados por request (custo/latência); o motor só injeta
// a restrição (estrutura-alvo) dinamicamente, a partir do erro ativo do usuário.
//
// "hint" é o direcional "use: X" mostrado ANTES de responder, em todo
// exercício (inclusive os 100% novos, que antes não tinham nenhum
// direcional). Curto, sempre com valor de aprendizagem — não é obrigatório
// seguir à risca, é um empurrão.

export const TRACKS = [
  { id: 'trabalho_remoto', label: 'Trabalho remoto' },
  { id: 'entrevistas', label: 'Entrevistas' },
  { id: 'viagem', label: 'Viagem' },
  { id: 'small_talk', label: 'Small talk & social' },
];

// stage: 1-indexed. Cada estágio tem cenários normais (writing/speaking) e
// um "boss" — cenário mais longo, sem chip de ajuda, que fecha o estágio.
export const STAGES = {
  trabalho_remoto: [
    {
      stage: 1,
      scenarios: {
        writing: [
          { id: 'tr_1_w1', label: 'MENSAGEM NO SLACK', context: 'Seu gerente perguntou no Slack se o relatório fica pronto hoje.', askPt: 'Responda de forma direta, mas educada.', hint: 'use: I\'ll have it by...' },
          { id: 'tr_1_w2', label: 'E-MAIL DE STATUS', context: 'Você precisa atualizar o time sobre o andamento de um projeto.', askPt: 'Escreva um resumo curto do progresso e do próximo passo.', hint: 'use: I\'m currently...' },
          { id: 'tr_1_w3', label: 'PEDIDO DE PRAZO', context: 'Você não vai conseguir entregar a tarefa no prazo combinado.', askPt: 'Avise seu gerente e peça mais tempo.', hint: 'use: could I have...' },
        ],
        speaking: [
          { id: 'tr_1_s1', label: 'DAILY STANDUP', context: 'É sua vez de falar na daily meeting.', askPt: 'Diga o que fez ontem e o que vai fazer hoje.', hint: 'use: yesterday I... today I\'ll...' },
          { id: 'tr_1_s2', label: 'PEDIR AJUDA', context: 'Você está travado em uma tarefa técnica.', askPt: 'Peça ajuda a um colega de forma natural.', hint: 'use: could you help me...' },
          { id: 'tr_1_s3', label: 'AGENDAR REUNIÃO', context: 'Você precisa remarcar uma reunião com um cliente.', askPt: 'Proponha um novo horário educadamente.', hint: 'use: would it work if...' },
        ],
        boss: {
          writing: { id: 'tr_1_boss_w', label: 'E-MAIL DIFÍCIL', context: 'O projeto vai atrasar por um motivo fora do seu controle e você precisa avisar o cliente.', askPt: 'Escreva um email explicando o atraso, sem soar como desculpa, e proponha um novo prazo.' },
        },
      },
    },
    {
      stage: 2,
      scenarios: {
        writing: [
          { id: 'tr_2_w1', label: 'DIZER NÃO', context: 'Pediram para você assumir mais uma tarefa essa semana, mas sua agenda já está cheia.', askPt: 'Recuse educadamente, sem se justificar demais.', hint: 'use: I won\'t be able to...' },
          { id: 'tr_2_w2', label: 'COBRAR RETORNO', context: 'Você enviou uma proposta há uma semana e não teve resposta.', askPt: 'Escreva um follow-up educado cobrando retorno.', hint: 'use: just following up on...' },
          { id: 'tr_2_w3', label: 'FEEDBACK DIFÍCIL', context: 'Um colega entregou um trabalho com problemas e você precisa dar feedback por escrito.', askPt: 'Aponte o problema de forma construtiva.', hint: 'use: one thing to improve...' },
        ],
        speaking: [
          { id: 'tr_2_s1', label: 'DISCORDAR EM REUNIÃO', context: 'Você discorda de uma decisão que acabaram de propor na reunião.', askPt: 'Discorde de forma educada e explique o porquê.', hint: 'use: I see it a bit differently' },
          { id: 'tr_2_s2', label: 'NEGOCIAR PRAZO', context: 'Seu chefe quer a entrega antes do que é realista.', askPt: 'Negocie um prazo mais viável.', hint: 'use: would it be possible to...' },
          { id: 'tr_2_s3', label: 'APRESENTAR RESULTADO', context: 'Você vai apresentar o resultado de um projeto para o time.', askPt: 'Resuma o resultado em poucas frases.', hint: 'use: past simple + resultado' },
        ],
        boss: {
          speaking: { id: 'tr_2_boss_s', label: 'REUNIÃO TENSA', context: 'Um stakeholder está insatisfeito com o andamento do projeto numa call.', askPt: 'Explique a situação, assuma o que for necessário e proponha um plano — sem se desculpar excessivamente nem soar defensivo.' },
        },
      },
    },
  ],

  entrevistas: [
    {
      stage: 1,
      scenarios: {
        writing: [
          { id: 'ev_1_w1', label: 'EMAIL DE APRESENTAÇÃO', context: 'Você quer se candidatar a uma vaga através de um contato em comum.', askPt: 'Escreva um email curto se apresentando e pedindo indicação.', hint: 'use: I was wondering if...' },
          { id: 'ev_1_w2', label: 'RESPOSTA A RECRUTADOR', context: 'Um recrutador te chamou no LinkedIn perguntando sua pretensão salarial.', askPt: 'Responda de forma profissional, sem se comprometer demais.', hint: 'use: my range is around...' },
          { id: 'ev_1_w3', label: 'AGRADECIMENTO PÓS-ENTREVISTA', context: 'Você acabou de terminar uma entrevista.', askPt: 'Escreva um email curto de agradecimento.', hint: 'use: thank you for...' },
        ],
        speaking: [
          { id: 'ev_1_s1', label: 'SE APRESENTAR', context: 'A entrevista está começando.', askPt: 'Se apresente em 30 segundos: quem você é e o que faz.', hint: 'use: present simple (I am / I do)' },
          { id: 'ev_1_s2', label: 'PONTO FORTE', context: 'O entrevistador perguntou seu maior ponto forte.', askPt: 'Responda com um exemplo concreto.', hint: 'use: for example, when I...' },
          { id: 'ev_1_s3', label: 'POR QUE ESSA VAGA', context: 'O entrevistador perguntou por que você quer essa vaga.', askPt: 'Dê uma resposta específica, não genérica.', hint: 'use: what excites me is...' },
        ],
        boss: {
          speaking: { id: 'ev_1_boss_s', label: 'PERGUNTA INESPERADA', context: 'O entrevistador pergunta sobre um erro grande que você cometeu no trabalho.', askPt: 'Conte a situação, o que aprendeu, e como mudou depois — sem parecer ensaiado.' },
        },
      },
    },
    {
      stage: 2,
      scenarios: {
        writing: [
          { id: 'ev_2_w1', label: 'NEGOCIAR PROPOSTA', context: 'Você recebeu uma proposta abaixo do que esperava.', askPt: 'Responda contrapropondo educadamente.', hint: 'use: would you be open to...' },
          { id: 'ev_2_w2', label: 'RECUSAR OFERTA', context: 'Você decidiu não seguir com um processo seletivo.', askPt: 'Escreva recusando a oferta educadamente, deixando a porta aberta.', hint: 'use: I\'ve decided not to...' },
        ],
        speaking: [
          { id: 'ev_2_s1', label: 'FRAQUEZA', context: 'O entrevistador perguntou seu maior ponto fraco.', askPt: 'Responda com honestidade, mas mostrando que trabalha nisso.', hint: 'use: I\'m working on...' },
          { id: 'ev_2_s2', label: 'PERGUNTAS PRA ELES', context: 'Chegou sua vez de fazer perguntas pro entrevistador.', askPt: 'Faça 1-2 perguntas relevantes sobre a vaga ou o time.', hint: 'use: could you tell me...' },
        ],
        boss: {
          writing: { id: 'ev_2_boss_w', label: 'NEGOCIAÇÃO COMPLETA', context: 'Você recebeu uma proposta e quer negociar salário E data de início ao mesmo tempo.', askPt: 'Escreva um email negociando os dois pontos de forma equilibrada.' },
        },
      },
    },
  ],

  viagem: [
    {
      stage: 1,
      scenarios: {
        writing: [
          { id: 'vg_1_w1', label: 'EMAIL PARA O HOTEL', context: 'Você chega antes do horário de check-in.', askPt: 'Pergunte educadamente se dá para fazer o check-in mais cedo.', hint: 'use: would it be possible to...' },
          { id: 'vg_1_w2', label: 'RECLAMAÇÃO EDUCADA', context: 'Seu quarto de hotel não estava como o anunciado.', askPt: 'Escreva reclamando de forma educada e pedindo solução.', hint: 'use: I was expecting...' },
        ],
        speaking: [
          { id: 'vg_1_s1', label: 'RESTAURANTE', context: 'Você terminou de comer e quer ir embora.', askPt: 'Peça a conta com educação.', hint: 'use: could we get the bill...' },
          { id: 'vg_1_s2', label: 'AEROPORTO', context: 'Você está perdido no terminal.', askPt: 'Pergunte a alguém onde fica o portão 22.', hint: 'use: excuse me, where is...' },
          { id: 'vg_1_s3', label: 'TÁXI', context: 'Você entra num táxi.', askPt: 'Explique onde quer ir e pergunte quanto tempo demora.', hint: 'use: how long does it take...' },
        ],
        boss: {
          speaking: { id: 'vg_1_boss_s', label: 'VOO CANCELADO', context: 'Seu voo foi cancelado em cima da hora.', askPt: 'Negocie com a atendente um novo voo e acomodação, mantendo a calma.' },
        },
      },
    },
    {
      stage: 2,
      scenarios: {
        writing: [
          { id: 'vg_2_w1', label: 'CANCELAMENTO', context: 'Você precisa cancelar uma reserva de última hora.', askPt: 'Escreva pedindo cancelamento e perguntando sobre reembolso.', hint: 'use: I need to cancel...' },
        ],
        speaking: [
          { id: 'vg_2_s1', label: 'FARMÁCIA', context: 'Você está com dor de cabeça e precisa de remédio.', askPt: 'Explique o sintoma e peça uma recomendação.', hint: 'use: I have a...' },
          { id: 'vg_2_s2', label: 'TROCAR PRODUTO', context: 'Você comprou algo com defeito numa loja.', askPt: 'Peça para trocar ou ser reembolsado.', hint: 'use: I\'d like to exchange...' },
        ],
        boss: {
          writing: { id: 'vg_2_boss_w', label: 'BAGAGEM EXTRAVIADA', context: 'Sua mala não chegou no destino.', askPt: 'Escreva um email para a companhia aérea relatando o problema e pedindo atualização.' },
        },
      },
    },
  ],

  small_talk: [
    {
      stage: 1,
      scenarios: {
        writing: [
          { id: 'st_1_w1', label: 'MENSAGEM CASUAL', context: 'Um colega de outro país te chamou pra um happy hour virtual.', askPt: 'Responda confirmando presença, de forma descontraída.', hint: 'use: count me in' },
        ],
        speaking: [
          { id: 'st_1_s1', label: 'PUXAR ASSUNTO', context: 'Você está numa sala de espera com um estranho.', askPt: 'Puxe conversa sobre algo neutro (clima, o lugar).', hint: 'use: so, how\'s...' },
          { id: 'st_1_s2', label: 'REENCONTRO', context: 'Você encontra um conhecido depois de muito tempo.', askPt: 'Cumprimente e pergunte como ele está.', hint: 'use: it\'s been a while' },
          { id: 'st_1_s3', label: 'ELOGIAR', context: 'Alguém acabou de fazer uma apresentação boa.', askPt: 'Elogie de forma genuína, não exagerada.', hint: 'use: that was really...' },
        ],
        boss: {
          speaking: { id: 'st_1_boss_s', label: 'HAPPY HOUR', context: 'Você está num happy hour da empresa com pessoas que não conhece bem.', askPt: 'Puxe conversa, responda perguntas pessoais leves e mantenha o papo fluindo por algumas trocas.' },
        },
      },
    },
    {
      stage: 2,
      scenarios: {
        writing: [
          { id: 'st_2_w1', label: 'CONVITE', context: 'Você quer convidar um colega novo para almoçar.', askPt: 'Escreva o convite de forma casual e simpática.', hint: 'use: want to grab lunch...' },
        ],
        speaking: [
          { id: 'st_2_s1', label: 'DISCORDAR CASUAL', context: 'Um amigo sugeriu um restaurante que você não gosta.', askPt: 'Discorde de forma leve e sugira outra opção.', hint: 'use: I was actually thinking...' },
          { id: 'st_2_s2', label: 'DESPEDIDA', context: 'A festa está acabando e você precisa ir embora.', askPt: 'Se despeça de forma natural, sem parecer abrupto.', hint: 'use: I should get going' },
        ],
        boss: {
          writing: { id: 'st_2_boss_w', label: 'GRUPO DO TRABALHO', context: 'Alguém no grupo do trabalho fez uma piada que você achou sem graça, e agora estão perguntando sua opinião sobre um plano de happy hour.', askPt: 'Responda de forma natural, mudando o assunto pro plano sem ser rude.' },
        },
      },
    },
  ],
};

export function getTrackStages(trackId) {
  return STAGES[trackId] || [];
}

export function getStage(trackId, stage) {
  return getTrackStages(trackId).find((s) => s.stage === stage) || null;
}

export function trackLabel(trackId) {
  return TRACKS.find((t) => t.id === trackId)?.label || trackId;
}

export function isLastStage(trackId, stage) {
  const stages = getTrackStages(trackId);
  return stages.length > 0 && stage >= stages[stages.length - 1].stage;
}
