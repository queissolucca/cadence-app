import './globals.css';
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from 'next/font/google';

// Antes: 3 <link> pra fonts.googleapis.com/fonts.gstatic.com — cada carga de
// página pagava DNS + conexão + uma requisição render-blocking antes mesmo
// do CSS terminar de baixar. next/font faz o download em build time, serve
// os arquivos do próprio domínio (sem round-trip externo) e evita FOIT/CLS
// com font-display:swap automático. Mesmas famílias/pesos de antes, só a
// forma de carregar que muda.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-display-loaded',
  display: 'swap',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-ui-loaded',
  display: 'swap',
});
const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata = {
  title: 'cadence — Você já sabe inglês. É hora de aprender de vez.',
  description: 'Seu treino de inglês com correção inteligente, revisão espaçada e memória de aprendizado.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${hanken.variable} ${splineMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
