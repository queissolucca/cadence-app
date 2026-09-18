import '../comecar/comecar.css';

// Importa a MESMA folha da nova interface, e não uma cópia: é isso que faz o
// /pagamento ser pixel a pixel a tela do fim do onboarding, em vez de uma
// imitação que envelhece sozinha. Como o CSS entra num layout aninhado, ele só
// vai no bundle desta rota — /v2 e a landing seguem intocados.
export const metadata = {
  title: 'cadence — garantir meu acesso',
  description: 'Três meses de conversa em inglês com a Cady, por R$ 89,90.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

// A barra do navegador acompanha o topo da tela. Era #0C0A0C, de quando
// estas rotas eram escuras; num app claro isso vira uma tarja preta em
// cima do conteúdo, que só aparece no celular e passa despercebido no
// computador.
export const viewport = { themeColor: '#EAF6EE' };

export default function PagamentoLayout({ children }) {
  return children;
}
