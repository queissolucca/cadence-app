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
   rede está indo mal. */
export default function Reconectando() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="refresh" content="2" />
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
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          border: '3px solid #2A252A', borderTopColor: '#3E9B5F',
          animation: 'gira 0.9s linear infinite',
        }} />
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Reconectando…</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#9C9498', maxWidth: 300 }}>
          Sua conta continua aberta. Só a conexão oscilou — eu volto pra onde você estava em um instante.
        </p>
        <style>{'@keyframes gira{to{transform:rotate(360deg)}}'
          + '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'}</style>
      </body>
    </html>
  );
}
