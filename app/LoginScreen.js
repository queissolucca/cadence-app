'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError('Não consegui iniciar o login. Tente de novo.');
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="login-screen">
          <div className="logo">cadence</div>
          <p className="subtitle">Você já sabe inglês. É hora de aprender de vez.</p>
          <div className="login-hero">
            <h1>Treino diário de inglês com correção inteligente e memória de longo prazo.</h1>
            <p>Entre com sua conta Google para salvar seu progresso e sincronizar entre dispositivos.</p>
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="google-btn" onClick={signInWithGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            {loading ? 'Entrando…' : 'Entrar com Google'}
          </button>
          <a href="/privacy" className="privacy-link">Política de privacidade</a>
        </div>
      </div>
    </main>
  );
}
