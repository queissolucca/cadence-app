import '../../comecar/comecar.css';

// Prévia da tela de cobrança sem exigir sessão nem conta paga. Mesma folha da
// rota real, então o que se vê aqui é o que roda em produção. Fora de /v2 e
// fora do funil, igual ao /dev/web-preview — não linkada de lugar nenhum.
export const metadata = { title: 'prévia · pagamento' };
export const viewport = { themeColor: '#0C0A0C' };

export default function Layout({ children }) {
  return children;
}
