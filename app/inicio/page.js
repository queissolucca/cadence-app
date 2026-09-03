import { Inter } from 'next/font/google';
import PorqueCadence from '../../components/inicio/PorqueCadence';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'Por que o Cadence?',
  description:
    'Se você já tentou outros apps de inglês, por que o Cadence seria diferente? Conversa por voz com a Cady, correção na hora e revisão personalizada, pra quem é intermediário e quer destravar a fala.',
};

export default function CadenceLandingPage() {
  return <PorqueCadence fontClass={inter.variable} />;
}
