import '../../comecar/comecar.css';

// Última tela do caminho de recuperação: é onde o link do e-mail cai. Leva a
// mesma folha do /login pra a pessoa não sair de um design e chegar em outro no
// meio de um fluxo de senha, que é justamente quando ela precisa reconhecer que
// está no site certo.
export const metadata = { title: 'cadence — nova senha' };
export const viewport = { themeColor: '#0C0A0C' };

export default function NovaSenhaLayout({ children }) {
  return children;
}
