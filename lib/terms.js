// Fonte única dos Termos e Condições de Uso do Cadence.
// Usado tanto pela página pública /termos quanto pelo step de aceite no
// onboarding. Ao alterar o texto de forma relevante, bump TERMS_VERSION —
// o aceite é gravado com a versão vigente (tabela public.terms_acceptance),
// então uma nova versão passa a exigir novo aceite.
export const TERMS_VERSION = '2026-09-02';

export const TERMS_UPDATED_LABEL = 'setembro de 2026';

// Cada cláusula: { n, title, body }. `title` e o número ficam em negrito na
// renderização; o corpo é texto corrido (sem negrito no meio).
export const TERMS_CLAUSES = [
  {
    n: 1,
    title: 'Aceitação dos Termos',
    body: 'Estes Termos e Condições de Uso ("Termos") regem o acesso e a utilização do aplicativo e da plataforma Cadence ("Serviço"), disponibilizados pela Cadence ("Empresa"). Ao criar uma conta, efetuar o pagamento e/ou utilizar o Serviço, o usuário ("Usuário") declara ter lido, compreendido e aceito integralmente estes Termos e a Política de Privacidade. Caso não concorde, o Usuário não deverá utilizar o Serviço.',
  },
  {
    n: 2,
    title: 'Cadastro, conta e acesso',
    body: '2.1. O acesso ao Serviço depende de cadastro válido e do pagamento da oferta contratada. 2.2. O Usuário é responsável pela veracidade e atualização dos dados informados e pela guarda e confidencialidade de suas credenciais, respondendo por todas as atividades realizadas em sua conta. 2.3. O Serviço destina-se a maiores de 18 anos; menores devem utilizá-lo sob supervisão e consentimento de responsável legal.',
  },
  {
    n: 3,
    title: 'Propriedade intelectual',
    body: 'Todo o conteúdo, marca, nome, identidade visual, software, textos, trilhas, prompts e materiais do Cadence são de titularidade exclusiva da Empresa ou de seus licenciadores, sendo vedada a reprodução, distribuição, modificação ou uso não autorizado.',
  },
  {
    n: 4,
    title: 'Privacidade e proteção de dados',
    body: 'O tratamento de dados pessoais observa a Política de Privacidade e a Lei nº 13.709/2018 (LGPD). Áudios de fala não são armazenados; apenas as transcrições e os dados necessários ao funcionamento do Serviço são tratados.',
  },
  {
    n: 5,
    title: 'Pagamento, oferta de lançamento e cobrança',
    body: '5.1. Os valores, condições e a oferta de lançamento são estabelecidos pela Empresa e podem ter prazo, vagas e condições limitadas, a seu exclusivo critério. 5.2. Encerrado o período promocional, o acesso poderá passar a ser cobrado de forma recorrente/mensal, mediante comunicação ao Usuário. 5.3. Os pagamentos são processados por provedores terceiros; a Empresa não armazena dados sensíveis de meios de pagamento.',
  },
  {
    n: 6,
    title: 'Interrupção, suspensão, pausa ou descontinuação do Serviço',
    body: 'A Empresa, na qualidade de titular e proprietária do produto, reserva-se o direito de, a seu exclusivo critério e a qualquer tempo, interromper, suspender, pausar, modificar, limitar ou descontinuar, total ou parcialmente, o Serviço e quaisquer de suas funcionalidades, de forma temporária ou definitiva, com ou sem aviso prévio, sem que tal medida enseje ao Usuário qualquer direito a reembolso, indenização, compensação, abatimento ou ressarcimento de valores pagos, renunciando o Usuário, desde já e de forma expressa e irrevogável, a qualquer pretensão, reclamação ou pleito nesse sentido, ressalvadas exclusivamente as hipóteses cogentes previstas em lei.',
  },
  {
    n: 7,
    title: 'Uso adequado e condutas vedadas',
    body: 'É vedado ao Usuário: (i) utilizar o Serviço para fins ilícitos, fraudulentos, ofensivos, discriminatórios ou que violem direitos de terceiros; (ii) tentar acessar áreas restritas, realizar engenharia reversa, automatizar acessos indevidos ou comprometer a segurança, a estabilidade ou a integridade da plataforma; (iii) compartilhar credenciais ou revender o acesso. O descumprimento poderá ensejar a suspensão ou o encerramento da conta, sem reembolso.',
  },
  {
    n: 8,
    title: 'Limitação de responsabilidade',
    body: 'Na máxima extensão permitida pela lei, a Empresa não será responsável por danos indiretos, lucros cessantes, perda de dados ou prejuízos decorrentes de indisponibilidade, interrupção, imprecisão de conteúdo gerado por IA ou uso inadequado do Serviço.',
  },
  {
    n: 9,
    title: 'Alterações dos Termos',
    body: 'A Empresa poderá atualizar estes Termos a qualquer tempo. A versão vigente estará sempre disponível no Serviço, e o uso continuado após a atualização implica aceite da nova versão.',
  },
  {
    n: 10,
    title: 'Inteligência artificial',
    body: 'As respostas, correções, exemplos e demais conteúdos gerados no Serviço são produzidos por modelos de inteligência artificial e podem, eventualmente, conter imprecisões, erros ou informações desatualizadas. O Usuário reconhece o caráter assistivo, probabilístico e não infalível da tecnologia e concorda em não utilizar o Serviço como única fonte para decisões relevantes.',
  },
  {
    n: 11,
    title: 'Descrição e natureza do Serviço',
    body: 'O Cadence é uma ferramenta de prática e aprendizado da língua inglesa assistida por inteligência artificial, incluindo conversação por voz e texto, correções, trilha de lições, revisão espaçada e recursos de gamificação. O Serviço tem caráter de apoio ao aprendizado, não substituindo ensino formal, certificações ou acompanhamento profissional. A Empresa não garante resultados específicos de fluência, aprovação em exames, desempenho ou qualquer objetivo particular, os quais dependem do empenho e da dedicação individual do Usuário.',
  },
  {
    n: 12,
    title: 'Legislação e foro',
    body: 'Estes Termos são regidos pela legislação brasileira. Fica eleito o foro do domicílio da Empresa para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.',
  },
];

export const TERMS_CLOSING =
  'Ao marcar "Li e aceito os Termos e Condições", o Usuário manifesta seu consentimento livre, informado e inequívoco.';
