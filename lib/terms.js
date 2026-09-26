// Fonte única dos Termos e Condições de Uso do Cadence.
// Usado tanto pela página pública /termos quanto pelo step de aceite no
// onboarding. Ao alterar o texto de forma relevante, bump TERMS_VERSION —
// o aceite é gravado com a versão vigente (tabela public.terms_acceptance),
// então uma nova versão passa a exigir novo aceite.
//
// 2026-09-26: cláusula 2 (idade mínima) — só maiores de 18, sem a exceção do
// "menor com supervisão" que o texto de 2026-09-02 abria. Nenhuma tela lê essa
// tabela pra barrar quem aceitou a versão anterior: o bump só faz os aceites
// NOVOS ficarem gravados com a versão que tem a cláusula.
export const TERMS_VERSION = '2026-09-26';

export const TERMS_UPDATED_LABEL = 'setembro de 2026';

// Cada cláusula: { n, title, body }. `title` e o número ficam em negrito na
// renderização; o corpo é texto corrido (sem negrito no meio).
export const TERMS_CLAUSES = [
  {
    n: 1,
    title: 'Aceitação dos Termos',
    body: 'Estes Termos e Condições de Uso ("Termos") regem o acesso e a utilização do aplicativo e da plataforma Cadence ("Serviço"), disponibilizados pela Cadence ("Empresa"). Ao criar uma conta, efetuar o pagamento e/ou utilizar o Serviço, o usuário ("Usuário") declara ter lido, compreendido e aceito integralmente estes Termos e a Política de Privacidade. Caso não concorde, o Usuário não deverá utilizar o Serviço.',
  },
  /* A IDADE MÍNIMA GANHOU CLÁUSULA PRÓPRIA, E LOGO NA SEGUNDA POSIÇÃO.

     Antes ela era o último subitem do cadastro (o antigo 2.3), e dizia duas
     coisas que se anulam: "destina-se a maiores de 18 anos; menores devem
     utilizá-lo sob supervisão e consentimento de responsável legal". A
     segunda metade LIBERA o menor — basta um responsável concordar. Quem lia
     entendia que o serviço era "de preferência" pra adultos, não "só".

     O pedido foi o contrário: só maiores de 18, dito com clareza. Por isso:

     - Cláusula inteira, com a regra no próprio título. Quem só passa o olho
       pelos títulos em negrito já leva a informação, sem abrir o corpo.
     - Vem logo depois da aceitação: é condição pra usar, então precede o
       cadastro, o pagamento e todo o resto. Isso empurrou a numeração das
       demais em uma casa (inclusive os subitens "N.1." dentro do corpo, que
       o teste tests/termosMaioridade.test.js confere pra não desalinhar).
     - "Ainda que com autorização, supervisão ou consentimento" fecha
       nominalmente a porta que o texto antigo abria. Proibição que não nomeia
       a exceção deixa a exceção de pé.
     - A consequência (suspender/encerrar e eliminar os dados) usa "poderá",
       não "irá": o app hoje não verifica idade, só registra a declaração.
       Prometer uma checagem que não existe seria pior do que não prometer.
       E não há "sem reembolso" aqui de propósito — cobrar de um menor e
       ainda negar a devolução é o tipo de cláusula que cai no CDC. */
  {
    n: 2,
    title: 'Idade mínima: uso exclusivo para maiores de 18 anos',
    body: '2.1. O Serviço é destinado exclusivamente a pessoas com 18 (dezoito) anos completos ou mais. É vedado o cadastro, a contratação e a utilização do Serviço por menores de 18 anos, ainda que com autorização, supervisão ou consentimento de pais ou responsáveis legais. 2.2. Ao criar uma conta, efetuar o pagamento e/ou utilizar o Serviço, o Usuário declara ter 18 anos completos ou mais, responsabilizando-se pela veracidade dessa declaração. 2.3. Constatado, a qualquer tempo, que a conta pertence a menor de 18 anos, a Empresa poderá suspendê-la ou encerrá-la e eliminar os dados pessoais a ela vinculados, ressalvadas as hipóteses de guarda obrigatória previstas em lei.',
  },
  {
    n: 3,
    title: 'Cadastro, conta e acesso',
    body: '3.1. O acesso ao Serviço depende de cadastro válido e do pagamento da oferta contratada. 3.2. O Usuário é responsável pela veracidade e atualização dos dados informados e pela guarda e confidencialidade de suas credenciais, respondendo por todas as atividades realizadas em sua conta.',
  },
  {
    n: 4,
    title: 'Propriedade intelectual',
    body: 'Todo o conteúdo, marca, nome, identidade visual, software, textos, trilhas, prompts e materiais do Cadence são de titularidade exclusiva da Empresa ou de seus licenciadores, sendo vedada a reprodução, distribuição, modificação ou uso não autorizado.',
  },
  {
    n: 5,
    title: 'Privacidade e proteção de dados',
    body: 'O tratamento de dados pessoais observa a Política de Privacidade e a Lei nº 13.709/2018 (LGPD). Áudios de fala não são armazenados; apenas as transcrições e os dados necessários ao funcionamento do Serviço são tratados.',
  },
  {
    n: 6,
    title: 'Pagamento, oferta de lançamento e cobrança',
    body: '6.1. Os valores, condições e a oferta de lançamento são estabelecidos pela Empresa e podem ter prazo, vagas e condições limitadas, a seu exclusivo critério. 6.2. Encerrado o período promocional, o acesso poderá passar a ser cobrado de forma recorrente/mensal, mediante comunicação ao Usuário. 6.3. Os pagamentos são processados por provedores terceiros; a Empresa não armazena dados sensíveis de meios de pagamento.',
  },
  {
    n: 7,
    title: 'Interrupção, suspensão, pausa ou descontinuação do Serviço',
    body: 'A Empresa, na qualidade de titular e proprietária do produto, reserva-se o direito de, a seu exclusivo critério e a qualquer tempo, interromper, suspender, pausar, modificar, limitar ou descontinuar, total ou parcialmente, o Serviço e quaisquer de suas funcionalidades, de forma temporária ou definitiva, com ou sem aviso prévio, sem que tal medida enseje ao Usuário qualquer direito a reembolso, indenização, compensação, abatimento ou ressarcimento de valores pagos, renunciando o Usuário, desde já e de forma expressa e irrevogável, a qualquer pretensão, reclamação ou pleito nesse sentido, ressalvadas exclusivamente as hipóteses cogentes previstas em lei.',
  },
  {
    n: 8,
    title: 'Uso adequado e condutas vedadas',
    body: 'É vedado ao Usuário: (i) utilizar o Serviço para fins ilícitos, fraudulentos, ofensivos, discriminatórios ou que violem direitos de terceiros; (ii) tentar acessar áreas restritas, realizar engenharia reversa, automatizar acessos indevidos ou comprometer a segurança, a estabilidade ou a integridade da plataforma; (iii) compartilhar credenciais ou revender o acesso. O descumprimento poderá ensejar a suspensão ou o encerramento da conta, sem reembolso.',
  },
  {
    n: 9,
    title: 'Limitação de responsabilidade',
    body: 'Na máxima extensão permitida pela lei, a Empresa não será responsável por danos indiretos, lucros cessantes, perda de dados ou prejuízos decorrentes de indisponibilidade, interrupção, imprecisão de conteúdo gerado por IA ou uso inadequado do Serviço.',
  },
  {
    n: 10,
    title: 'Alterações dos Termos',
    body: 'A Empresa poderá atualizar estes Termos a qualquer tempo. A versão vigente estará sempre disponível no Serviço, e o uso continuado após a atualização implica aceite da nova versão.',
  },
  {
    n: 11,
    title: 'Inteligência artificial',
    body: 'As respostas, correções, exemplos e demais conteúdos gerados no Serviço são produzidos por modelos de inteligência artificial e podem, eventualmente, conter imprecisões, erros ou informações desatualizadas. O Usuário reconhece o caráter assistivo, probabilístico e não infalível da tecnologia e concorda em não utilizar o Serviço como única fonte para decisões relevantes.',
  },
  {
    n: 12,
    title: 'Descrição e natureza do Serviço',
    body: 'O Cadence é uma ferramenta de prática e aprendizado da língua inglesa assistida por inteligência artificial, incluindo conversação por voz e texto, correções, trilha de lições, revisão espaçada e recursos de gamificação. O Serviço tem caráter de apoio ao aprendizado, não substituindo ensino formal, certificações ou acompanhamento profissional. A Empresa não garante resultados específicos de fluência, aprovação em exames, desempenho ou qualquer objetivo particular, os quais dependem do empenho e da dedicação individual do Usuário.',
  },
  {
    n: 13,
    title: 'Legislação e foro',
    body: 'Estes Termos são regidos pela legislação brasileira. Fica eleito o foro do domicílio da Empresa para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.',
  },
];

// O fecho repete a declaração de idade porque é a frase que fica colada no
// ato de marcar a caixa: quem aceita está, naquele gesto, declarando ter 18+.
export const TERMS_CLOSING =
  'Ao marcar "Li e aceito os Termos e Condições", o Usuário declara ter 18 anos completos ou mais e manifesta seu consentimento livre, informado e inequívoco.';
