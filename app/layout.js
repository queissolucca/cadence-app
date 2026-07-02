import './globals.css';

export const metadata = {
  title: 'cadence — inglês, pouco e sempre',
  description: 'Seu treino de inglês com correção inteligente, revisão espaçada e memória de aprendizado.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
