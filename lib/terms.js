// Fonte única dos Termos e Condições de Uso do Cadence.
// Usado tanto pela página pública /termos quanto pelo step de aceite no
// onboarding. Ao alterar o texto de forma relevante, bump TERMS_VERSION —
// o aceite é gravado com a versão vigente (tabela public.terms_acceptance).
//
// O QUE O BUMP FAZ, E O QUE ELE NÃO FAZ. Este comentário dizia que "uma nova
// versão passa a exigir novo aceite" — não passa. Conferido em 2026-09-26:
// NADA no app lê terms_acceptance de volta. A única escrita é o upsert do
// /api/terms/accept (chamado no fecho do cadastro, best-effort), e nenhum
// middleware, gate ou tela compara a versão aceita com esta. Então trocar a
// versão só muda o que fica GRAVADO nos próximos aceites: quem já tem conta
// não é parado nem perguntado de novo (vale a cláusula "Alterações dos
// Termos": o uso continuado implica aceite), e quem se cadastra daqui pra
// frente fica registrado na versão nova. Se um dia alguém criar um portão de
// reaceite em cima disto, o bump passa a travar TODO usuário existente — e aí
// tem que ser decisão de produto, não efeito colateral de corrigir texto.
//
// 2026-09-26: entra a cláusula 2 (idade mínima). A 2.3 antiga dizia que o
// Serviço "destina-se a maiores de 18 anos" e, na mesma frase, liberava menor
// "sob supervisão e consentimento de responsável legal" — ou seja, não era
// restrição nenhuma. Agora é: só 18 anos completos ou mais, sem exceção por
// autorização de responsável. As cláusulas seguintes andaram uma casa (e as
// subnumerações internas junto: 2.x virou 3.x, 5.x virou 6.x).
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
  /* Condição de ACESSO, por isso vem logo depois da Aceitação e antes do
     Cadastro: quem não tem 18 anos não chega a ter conta pra ser regida pelo
     resto. Cláusula própria (e não mais um item perdido no fim do Cadastro)
     pra ser achada por quem procura — título diz a regra inteira.

     Os quatro itens fecham as quatro portas: 2.1 diz quem pode; 2.2 tira a
     exceção que existia ("sob supervisão de responsável"), porque autorização
     dos pais não transforma menor em público do Serviço; 2.3 é a declaração
     que o aceite no cadastro passa a carregar (ver TERMS_CLOSING e as
     caixinhas de aceite); 2.4 dá à Empresa o que fazer quando descobrir.

     A declaração da 2.3 não é enfeite: pelo art. 180 do Código Civil, o menor
     entre 16 e 18 que "no ato de obrigar-se, declarou-se maior" não pode
     depois invocar a idade pra se eximir. Por isso ela tem que estar ESCRITA
     na caixinha que a pessoa marca, e não só aqui dentro.

     A 2.4 NÃO fala em "sem reembolso", de propósito: contrato com menor de 16
     é nulo (Código Civil, art. 166) e com quem tem de 16 a 18 é anulável
     (art. 171), e uma renúncia de reembolso assinada por quem não podia
     assinar é a primeira coisa a cair — além de ser péssima de defender.
     E "excluir os dados" vem com a ressalva da LGPD (art. 16) pelo mesmo
     motivo da política de privacidade: há dado que a lei manda guardar. */
  {
    n: 2,
    title: 'Idade mínima: exclusivo para maiores de 18 anos',
    body: '2.1. O Serviço é destinado exclusivamente a pessoas com 18 (dezoito) anos completos ou mais. 2.2. É vedado o cadastro e a utilização do Serviço por menores de 18 (dezoito) anos, ainda que com autorização, supervisão ou consentimento de pais ou responsável legal. 2.3. Ao se cadastrar, o Usuário declara ter 18 (dezoito) anos completos ou mais e garante que essa informação é verdadeira, respondendo por sua exatidão. 2.4. Caso identifique que o titular de uma conta é menor de 18 (dezoito) anos, ou tenha indícios disso, a Empresa poderá, a qualquer tempo, suspender ou encerrar a conta e excluir os dados pessoais a ela vinculados, nos termos da Lei nº 13.709/2018 (LGPD), ressalvada a conservação exigida por lei.',
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

/* O fecho carrega a declaração de maioridade junto do aceite: é o mesmo ato
   (marcar a caixinha no cadastro) que a cláusula 2.3 descreve, e as duas
   caixinhas de aceite dizem "declaro ter 18 anos ou mais" com todas as letras.

   Não cita mais a frase da caixinha entre aspas: ela citava "Li e aceito os
   Termos e Condições", que é o texto do /onboarding antigo — o cadastro de
   verdade (/comecar) sempre disse "Aceito os termos de uso e a política de
   privacidade". Descrever o ato em vez de citar o rótulo não desatualiza a
   cada ajuste de copy da tela. */
export const TERMS_CLOSING =
  'Ao marcar a caixa de aceite destes Termos no cadastro, o Usuário manifesta seu consentimento livre, informado e inequívoco e declara ter 18 (dezoito) anos completos ou mais.';
