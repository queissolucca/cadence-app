'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Constellation } from '../../components/comecar/Constellation';
import { Icon, SphereDefs } from '../../components/comecar/ui';
import { Cta, Field, Ghost, Grow, Lede, Wordmark } from '../../components/comecar/shell';
import { friendlyAuthError } from '../../lib/authErrors';

/* Entrar — a única tela de login do produto.

   Antes isto era um card claro do /v2 com quatro modos empilhados (entrar,
   criar conta, link mágico, esqueci a senha). Ficou com o design das 33 telas,
   e enxugou pro que a tela precisa ser:

   - CRIAR CONTA saiu daqui. A conta agora nasce no fim do onboarding, depois
     das 33 telas, porque é lá que existem as respostas pra gravar junto. Ter
     dois cadastros diferentes era ter dois lugares pra divergir.
   - LINK MÁGICO saiu, como pedido. Dava pra tirar sem trancar ninguém do lado
     de fora porque "esqueci minha senha" atende quem entrou por Google ou por
     link e nunca definiu senha: o e-mail de recuperação deixa definir uma.
   - ESQUECI MINHA SENHA ficou, e não era negociável. É a única saída de quem
     não tem senha ou esqueceu a que tinha. */

const G = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
  </svg>
);

const Erro = ({ children }) => (
  <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{children}</p>
);

export default function LoginPage() {
  const [modo, setModo] = useState('entrar');  // entrar | recuperar | enviado
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [vendo, setVendo] = useState(false);
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState('');

  const trocar = (m) => { setModo(m); setErro(''); };

  const porGoogle = async () => {
    setErro('');
    setIndo(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/v2` },
      });
      if (error) throw error;
      // Não desliga o `indo`: a página está saindo pro Google.
    } catch (e) {
      setErro(friendlyAuthError(e));
      setIndo(false);
    }
  };

  const entrar = async (e) => {
    e.preventDefault();
    setIndo(true);
    setErro('');
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      // location.href e não router.push: o middleware é quem decide o passo
      // certo (app, pagamento ou questionário), e ele só roda numa navegação
      // de verdade. Com push, o cliente ia pro /v2 e voltava.
      window.location.href = '/v2';
    } catch (err) {
      setErro(friendlyAuthError(err));
      setIndo(false);
    }
  };

  const recuperar = async (e) => {
    e.preventDefault();
    setIndo(true);
    setErro('');
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/nova-senha`,
      });
      if (error) throw error;
      setModo('enviado');
    } catch (err) {
      setErro(friendlyAuthError(err));
    }
    setIndo(false);
  };

  if (modo === 'enviado') {
    return (
      <>
        <SphereDefs />
        <div id="phone" className="dark">
          <Constellation />
          <div id="view">
            <div className="scr" style={{ justifyContent: 'center', textAlign: 'center' }}>
              <Grow />
              <Wordmark px={26} />
              <h1 style={{ marginTop: 20 }}>Olha seu e-mail.</h1>
              <Lede>Mandei um link pra <b>{email}</b>. Clicando nele você define uma senha nova e
                entra direto.</Lede>
              <Grow />
              <Ghost onClick={() => trocar('entrar')}>voltar pro login</Ghost>
            </div>
          </div>
        </div>
      </>
    );
  }

  const recuperando = modo === 'recuperar';

  return (
    <>
      <SphereDefs />
      <div id="phone" className="dark">
        <Constellation />
        <div id="view">
          <div className="scr" style={{ justifyContent: 'center' }}>
            <Grow />
            <Wordmark px={26} />
            {/* \n não vira quebra em JSX — precisa ser <br />. */}
            <h1 style={{ textAlign: 'center', marginTop: 20 }}>
              {recuperando
                ? <>Vamos recuperar<br />sua conta.</>
                : 'Bom te ver de volta.'}
            </h1>
            <Lede style={{ textAlign: 'center' }}>
              {recuperando
                ? 'Digita o e-mail da conta e eu te mando um link pra definir uma senha nova.'
                : 'Sua constelação está do jeito que você deixou.'}
            </Lede>

            {recuperando ? (
              <form onSubmit={recuperar} style={{ marginTop: 22 }}>
                <Field label="E-mail" type="email" placeholder="voce@email.com" autoComplete="email"
                  required value={email} onChange={(ev) => setEmail(ev.target.value)} />
                <Cta disabled={indo || !email.trim()}>
                  {indo ? 'enviando…' : 'enviar link de recuperação'}
                </Cta>
              </form>
            ) : (
              <form onSubmit={entrar} style={{ marginTop: 22 }}>
                <button type="button" className="gbtn" onClick={porGoogle} disabled={indo}>
                  <G />Continuar com o Google
                </button>
                <div className="orsep"><span /><i>ou</i><span /></div>

                <Field label="E-mail" type="email" placeholder="voce@email.com" autoComplete="email"
                  required value={email} onChange={(ev) => setEmail(ev.target.value)} />

                <div className="field">
                  <label>Senha</label>
                  <div className="fieldeye">
                    <input type={vendo ? 'text' : 'password'} placeholder="sua senha" required
                      autoComplete="current-password" value={senha}
                      onChange={(ev) => setSenha(ev.target.value)} />
                    <button type="button" onClick={() => setVendo((v) => !v)}
                      aria-label={vendo ? 'Esconder senha' : 'Mostrar senha'}>
                      <Icon name={vendo ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                </div>

                <Cta disabled={indo}>{indo ? 'entrando…' : 'entrar'}</Cta>
              </form>
            )}

            {erro && <Erro>{erro}</Erro>}

            {recuperando ? (
              <Ghost onClick={() => trocar('entrar')}>voltar pro login</Ghost>
            ) : (
              <>
                <Ghost onClick={() => trocar('recuperar')}>esqueci minha senha</Ghost>
                {/* Criar conta é o onboarding inteiro: as 33 telas terminam na
                    conta, e é lá que estão as respostas pra gravar junto. */}
                <Ghost onClick={() => { window.location.href = '/'; }}>
                  ainda não tenho conta · começar
                </Ghost>
              </>
            )}
            <Grow />
          </div>
        </div>
      </div>
    </>
  );
}
