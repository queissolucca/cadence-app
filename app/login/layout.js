import '../comecar/comecar.css';

// A MESMA folha das 33 telas, não uma cópia. O /login é o destino de todo
// redirecionamento de sessão (middleware, /pagamento, checkout expirado), então
// era a última tela grande do produto ainda no card claro do /v2 — e a primeira
// coisa que quem volta ao app vê.
export const metadata = {
  title: 'cadence — entrar',
  description: 'Entre na sua conta do Cadence.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

// A barra do navegador acompanha o topo da tela. Era #0C0A0C, de quando
// estas rotas eram escuras; num app claro isso vira uma tarja preta em
// cima do conteúdo, que só aparece no celular e passa despercebido no
// computador.
export const viewport = { themeColor: '#EAF6EE' };

export default function LoginLayout({ children }) {
  return children;
}
