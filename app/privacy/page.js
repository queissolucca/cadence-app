export const metadata = {
  title: 'Política de Privacidade — cadence',
};

export default function PrivacyPage() {
  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="screen" style={{ gap: 18 }}>
          <div>
            <div className="logo">cadence</div>
            <p className="subtitle">Política de Privacidade</p>
          </div>

          <div className="insight-box">
            <strong>Quem somos</strong>
            <p>
              O cadence é um aplicativo pessoal de aprendizado de inglês. Esta página explica quais dados
              coletamos, para que usamos e como você pode solicitar a remoção deles.
            </p>
          </div>

          <div className="insight-box">
            <strong>Dados que coletamos</strong>
            <p>
              Ao entrar com sua conta Google, recebemos seu nome, email e foto de perfil (via Google OAuth,
              processado pelo Supabase Auth). Também armazenamos as frases que você escreve ou fala durante os
              exercícios, as correções recebidas e seu histórico de prática, para viabilizar a repetição
              espaçada e o acompanhamento de progresso.
            </p>
          </div>

          <div className="insight-box">
            <strong>Como usamos seus dados</strong>
            <p>
              Seus textos e áudios transcritos são enviados à API da Anthropic (Claude) apenas para gerar a
              correção e o feedback de cada exercício. Os dados de progresso ficam armazenados em um banco de
              dados Postgres (Supabase), protegido por controle de acesso por usuário — cada pessoa só acessa
              os próprios dados.
            </p>
          </div>

          <div className="insight-box">
            <strong>Compartilhamento</strong>
            <p>
              Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing. Os dados só são
              processados pelos provedores necessários para o funcionamento do app: Google (autenticação),
              Supabase (banco de dados) e Anthropic (correção via IA).
            </p>
          </div>

          <div className="insight-box">
            <strong>Exclusão de dados</strong>
            <p>
              Você pode pedir a exclusão da sua conta e de todos os seus dados a qualquer momento, entrando em
              contato pelo email abaixo.
            </p>
          </div>

          <div className="insight-box muted">
            <strong>Contato</strong>
            <p>lucca.arashiro@gmail.com</p>
          </div>

          <a className="google-btn" href="/">Voltar</a>
        </div>
      </div>
    </main>
  );
}
