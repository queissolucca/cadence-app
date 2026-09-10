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

export const viewport = { themeColor: '#0C0A0C' };

export default function LoginLayout({ children }) {
  return children;
}
