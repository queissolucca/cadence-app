export default function AuthErrorPage() {
  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="login-screen">
          <div className="logo">cadence</div>
          <div className="login-hero">
            <h1>Não conseguimos concluir o login.</h1>
            <p>Volte e tente entrar com o Google novamente.</p>
          </div>
          <a className="google-btn" href="/">Voltar</a>
        </div>
      </div>
    </main>
  );
}
