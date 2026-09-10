import './comecar.css';

// Nova interface de entrada (as 33 telas). Vive numa rota própria, ao lado do
// funil atual (/experimentar → /login → /onboarding → /pagamento), sem
// substituir nada: quando for hora de virar a chave, é um redirect no
// middleware, e voltar atrás é desfazer esse mesmo redirect.
//
// O comecar.css é importado AQUI e não no layout raiz de propósito: no App
// Router, CSS importado num layout aninhado só entra no bundle das rotas
// daquele ramo. Ou seja, os tokens escuros e o `position:fixed` no html/body
// valem só dentro de /comecar — /v2 e a landing seguem intocados. E como o
// arquivo do filho é injetado depois do globals.css do pai, os `:root` daqui
// ganham sem precisar de !important.

export const metadata = {
  title: 'cadence — conversa curta, todo dia',
  description:
    'Você já sabe inglês. É hora de aprender de vez. Cinco minutos de conversa por dia com a Cady, '
    + 'com correção direta e repetição espaçada.',
  // Salvo na tela de início do iPhone, a barra de status fica translúcida sobre
  // o preto do app em vez de virar uma faixa branca.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

// Herda o resto do viewport do layout raiz (zoom travado, viewport-fit cover);
// aqui só pinta a barra do navegador de preto, porque esta rota é escura e o
// tema global do site é claro.
export const viewport = {
  themeColor: '#0C0A0C',
};

export default function ComecarLayout({ children }) {
  return children;
}
