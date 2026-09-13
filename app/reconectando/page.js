export const dynamic = 'force-dynamic';

/* A tela de "não deu pra confirmar sua sessão agora".

   Ela existe por causa de um relato concreto: no meio de uma conversa por voz,
   a pessoa caía no login. A causa era o portão tratar "não consegui verificar"
   como "não está logado" — e deslogar alguém por um soluço de rede é a pior
   resposta possível, porque destrói o que estava acontecendo.

   Agora o middleware não desloga mais; mas ele também não tem como montar a
   tela do app sem saber quem é a pessoa. Esta é a terceira saída: não desloga,
   não mostra erro, e tenta de novo sozinha.

   O recarregamento é da MESMA URL — o middleware serve isto por rewrite, então
   o endereço na barra continua sendo /v2/conversar (ou onde a pessoa estava), e
   o reload volta pra lá. Dois segundos: tempo de um soluço passar, e curto o
   bastante pra não parecer que travou.

   Sem JavaScript o <meta refresh> faz o mesmo trabalho — e aqui isso importa
   mais que o normal, porque este é justamente o estado em que alguma coisa na
   rede está indo mal.

   MAS ELE PRECISA DE UM TETO. Tentar de novo pra sempre, de 2 em 2 segundos, é
   um laço de recarga infinito: se a sessão não voltar (o refresh token de fato
   morreu, o Supabase caiu, o relógio do aparelho está errado), a pessoa fica
   presa num pião girando, queimando bateria e rede, sem nenhum caminho de saída
   na tela. E como a URL é reescrita, ela nem sabe onde está.

   Seis tentativas — doze segundos — é mais que suficiente pra um soluço passar.
   Depois disso a tela para de girar e oferece a porta. O contador vive no
   sessionStorage porque a URL não pode carregá-lo (o rewrite tem que preservar
   o endereço pra voltar pra onde a pessoa estava). */
export default function Reconectando() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="refresh" content="2" id="tentar-de-novo" />
        <title>Reconectando…</title>
      </head>
      <body style={{
        margin: 0, minHeight: '100dvh', background: '#0C0A0C', color: '#f2f2ea',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 18, padding: 24, textAlign: 'center',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
      }}>
        {/* Sem dependência nenhuma: esta tela tem que funcionar quando o resto
            não está funcionando. */}
        <div id="girando" style={{
          width: 34, height: 34, borderRadius: '50%',
          border: '3px solid #2A252A', borderTopColor: '#3E9B5F',
          animation: 'gira 0.9s linear infinite',
        }} />
        <p id="dizeres" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Reconectando…</p>
        <p id="desisti" style={{ margin: 0, fontSize: 15, lineHeight: 1.5, maxWidth: 300 }}>
          Não consegui reconectar sozinho.{' '}
          <a href="/login" style={{ color: '#9FF0C4', fontWeight: 700 }}>Entrar de novo</a>
        </p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#9C9498', maxWidth: 300 }}>
          Sua conta continua aberta. Só a conexão oscilou — eu volto pra onde você estava em um instante.
        </p>
        <style>{'@keyframes gira{to{transform:rotate(360deg)}}'
          + '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'
          + '#desisti{display:none;color:#9FF0C4}'
          + 'html.parou #desisti{display:block}'
          + 'html.parou #girando,html.parou #dizeres{display:none}'}</style>
        {/* O teto do laço. Inline e sem dependência nenhuma: esta tela roda
            justamente quando o resto não está rodando. Se não houver JS, o
            <meta refresh> continua tentando — o que é o comportamento antigo, e
            é melhor que uma tela morta. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var k='cadence.reconectando';
  var n=(parseInt(sessionStorage.getItem(k),10)||0)+1;
  sessionStorage.setItem(k,String(n));
  if(n>6){
    var m=document.getElementById('tentar-de-novo');
    if(m)m.parentNode.removeChild(m);
    document.documentElement.className='parou';
    sessionStorage.removeItem(k);
  }
}catch(e){}})();`,
          }}
        />
      </body>
    </html>
  );
}
