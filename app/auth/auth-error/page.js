import { CadenceLogo } from '../../../components/v2/CadenceLogo';

/* A TELA DE QUANDO O LINK NÃO ABRE A SESSÃO.

   Ela dizia uma frase só — "volte e tente entrar com o Google novamente" — e
   era mostrada pra TODO mundo que falhava aqui, inclusive quem tinha acabado
   de confirmar o e-mail de cadastro e nunca tocou no Google. A pessoa lia uma
   instrução que não se aplicava a ela e ficava sem saber o que fazer.

   Agora o `/auth/callback` diz o motivo na query, e cada motivo tem a sua
   saída. Não é enfeite: "o link expirou" e "você abriu em outro navegador"
   pedem ações DIFERENTES, e mandar a pessoa repetir a ação errada é o que faz
   ela desistir. */

const MOTIVOS = {
  expirado: {
    titulo: 'Esse link já venceu.',
    texto: 'Links de e-mail valem uma vez só, e por pouco tempo. Peça um novo '
      + 'na tela de entrar — leva um minuto.',
    acao: { texto: 'pedir um link novo', href: '/login' },
  },
  outro_navegador: {
    titulo: 'Esse link precisa abrir onde começou.',
    texto: 'Você começou num navegador e abriu o link em outro — por segurança, '
      + 'a confirmação só vale no mesmo. Abra o e-mail no aparelho onde criou a '
      + 'conta, ou entre direto com sua senha.',
    acao: { texto: 'entrar com e-mail e senha', href: '/login' },
  },
  link: {
    titulo: 'Esse link não vale mais.',
    texto: 'Ele pode já ter sido usado. Se você não conseguiu entrar, peça um novo.',
    acao: { texto: 'pedir um link novo', href: '/login' },
  },
  sem_token: {
    titulo: 'Faltou alguma coisa nesse link.',
    texto: 'Ele pode ter sido cortado pelo aplicativo de e-mail. Tente abrir de '
      + 'novo pelo e-mail original, ou entre com sua senha.',
    acao: { texto: 'ir para a tela de entrar', href: '/login' },
  },
};

const PADRAO = {
  titulo: 'Não consegui te conectar.',
  texto: 'Alguma coisa saiu do lugar no caminho. Entrar com e-mail e senha resolve.',
  acao: { texto: 'ir para a tela de entrar', href: '/login' },
};

export default function AuthErrorPage({ searchParams }) {
  const { titulo, texto, acao } = MOTIVOS[searchParams?.motivo] || PADRAO;

  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="login-screen">
          <CadenceLogo word={26} />
          <div className="login-hero">
            <h1>{titulo}</h1>
            <p>{texto}</p>
          </div>
          <a className="google-btn" href={acao.href}>{acao.texto}</a>
        </div>
      </div>
    </main>
  );
}
