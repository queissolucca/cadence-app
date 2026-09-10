'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { Constellation } from '../../../components/comecar/Constellation';
import { Icon, SphereDefs } from '../../../components/comecar/ui';
import { Cta, Ghost, Grow, Lede, Wordmark } from '../../../components/comecar/shell';
import { friendlyAuthError } from '../../../lib/authErrors';

/* Destino do link de "esqueci minha senha": o /auth/callback troca o código por
   uma sessão de recuperação e manda pra cá. Este é o ÚNICO lugar onde dá pra
   trocar a senha sem saber a antiga — o link no e-mail é a prova de quem é a
   pessoa. (Trocar estando logado exige a senha atual: Perfil → Senha.)

   Ficou com o design das 33 telas junto com o /login: sair de um visual e
   chegar em outro no meio de um fluxo de senha é exatamente quando a pessoa
   precisa reconhecer que continua no site certo. */

function Casca({ children }) {
  return (
    <>
      <SphereDefs />
      <div id="phone" className="dark">
        <Constellation />
        <div id="view">
          <div className="scr" style={{ justifyContent: 'center' }}>
            <Grow />
            <Wordmark px={26} />
            {children}
            <Grow />
          </div>
        </div>
      </div>
    </>
  );
}

export default function NovaSenhaPage() {
  const [checando, setChecando] = useState(true);
  const [temSessao, setTemSessao] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [vendo, setVendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      setTemSessao(!!data.session);
      setChecando(false);
    });
  }, []);

  // Igual à criação de conta: 8 caracteres e confirmação idêntica LETRA POR
  // LETRA. Um espaço no fim é uma senha diferente na hora de entrar.
  const curta = senha.length > 0 && senha.length < 8;
  const naoBate = confirma.length > 0 && confirma !== senha;
  const travado = senha.length < 8 || confirma !== senha;

  const salvar = async (e) => {
    e.preventDefault();
    if (travado) return;
    setErro('');
    setSalvando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) {
      setErro(friendlyAuthError(error));
      setSalvando(false);
      return;
    }
    // Registra no banco (password_set_at + histórico). Best-effort: a senha já
    // trocou de verdade, e falhar o registro não pode desfazer isso.
    try { await fetch('/api/account/password/record', { method: 'POST' }); } catch { /* noop */ }
    setPronto(true);
    setSalvando(false);
  };

  if (checando) {
    return <Casca><Lede style={{ textAlign: 'center' }}>Um momento…</Lede></Casca>;
  }

  if (pronto) {
    return (
      <Casca>
        <h1 style={{ textAlign: 'center', marginTop: 20 }}>Senha trocada.</h1>
        <Lede style={{ textAlign: 'center' }}>Agora você entra com o seu e-mail e essa senha nova.</Lede>
        <Cta onClick={() => { window.location.href = '/v2'; }}>ir pro app</Cta>
      </Casca>
    );
  }

  if (!temSessao) {
    return (
      <Casca>
        <h1 style={{ textAlign: 'center', marginTop: 20 }}>Esse link já venceu.</h1>
        <Lede style={{ textAlign: 'center' }}>Links de recuperação valem por pouco tempo e só uma
          vez. Pede um novo na tela de entrar.</Lede>
        <Cta onClick={() => { window.location.href = '/login'; }}>pedir um link novo</Cta>
      </Casca>
    );
  }

  return (
    <Casca>
      <h1 style={{ textAlign: 'center', marginTop: 20 }}>Escolhe sua<br />senha nova.</h1>
      <form onSubmit={salvar} style={{ marginTop: 22 }}>
        <div className="field">
          <label>Senha nova</label>
          <div className="fieldeye">
            <input type={vendo ? 'text' : 'password'} placeholder="mínimo 8 caracteres" autoFocus
              autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" onClick={() => setVendo((v) => !v)}
              aria-label={vendo ? 'Esconder senha' : 'Mostrar senha'}>
              <Icon name={vendo ? 'eyeOff' : 'eye'} />
            </button>
          </div>
          {curta && <p className="fielderr">A senha precisa de pelo menos 8 caracteres.</p>}
        </div>

        <div className="field">
          <label>Confirmar senha nova</label>
          <input type={vendo ? 'text' : 'password'} placeholder="repita a senha"
            autoComplete="new-password" className={naoBate ? 'ruim' : ''}
            aria-invalid={naoBate ? 'true' : undefined}
            value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          {naoBate && <p className="fielderr">As senhas não são iguais.</p>}
        </div>

        <Cta disabled={salvando || travado}>{salvando ? 'salvando…' : 'salvar senha nova'}</Cta>
      </form>
      {erro && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{erro}</p>}
      <Ghost onClick={() => { window.location.href = '/login'; }}>voltar pro login</Ghost>
    </Casca>
  );
}
