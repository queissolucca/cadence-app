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

export const viewport = { themeColor: '#0C0A0C' };

export default function PagamentoLayout({ children }) {
  return children;
}
