import '../../comecar/comecar.css';

// Última tela do caminho de recuperação: é onde o link do e-mail cai. Leva a
// mesma folha do /login pra a pessoa não sair de um design e chegar em outro no
// meio de um fluxo de senha, que é justamente quando ela precisa reconhecer que
// está no site certo.
export const metadata = { title: 'cadence — nova senha' };
// A barra do navegador acompanha o topo da tela. Era #0C0A0C, de quando
// estas rotas eram escuras; num app claro isso vira uma tarja preta em
// cima do conteúdo, que só aparece no celular e passa despercebido no
// computador.
export const viewport = { themeColor: '#EAF6EE' };

export default function NovaSenhaLayout({ children }) {
  return children;
}
