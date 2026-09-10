'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { Constellation } from '../../components/comecar/Constellation';
import { SphereDefs } from '../../components/comecar/ui';
import { Cta, Ghost, Grow, Kicker, Lede } from '../../components/comecar/shell';
import { PlanoCard } from '../../components/comecar/PlanoCard';
import { abrirCheckout, mensagemDe } from '../../lib/comecar/conta';

/* A tela de pagamento, com a mesma casca das 33 telas.

   Antes esta página era um card claro do /v2 e o botão era um <a> apontando pro
   link ESTÁTICO do AbacatePay (NEXT_PUBLIC_PAYMENT_LINK_URL). Aquele link não
   sabe quem está pagando: o pagamento voltava anônimo e o acesso não chegava em
   ninguém — foi esse exatamente o bug que abriu este projeto. Agora o botão
   chama /api/checkout, que cria a cobrança amarrada à sessão. */

export function PagamentoTela({ email, minutos, expirado }) {
  const [indo, setIndo] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState('');

  const pagar = async () => {
    setIndo(true);
    setErro('');
    try {
      await abrirCheckout();   // não retorna: sai da página pro AbacatePay
    } catch (e) {
      setErro(mensagemDe(e));
      setIndo(false);
    }
  };

  const trocarConta = async () => {
    setSaindo(true);
    try { await createClient().auth.signOut(); } catch { /* segue */ }
    window.location.href = '/login';
  };

  return (
    <>
      <SphereDefs />
      <div id="phone" className="dark">
        <Constellation />
        <div id="view">
          <div className="scr">
            <Kicker>{expirado ? 'Seu acesso venceu' : 'Último passo'}</Kicker>
            <h1 style={{ marginTop: 8 }}>
              {expirado ? 'Bora continuar de onde você parou.' : 'Seu plano está pronto.'}
            </h1>
            <Lede>
              {expirado
                ? 'Sua constelação continua salva. Renovando, você volta exatamente pro ponto em que estava.'
                : 'Montei ele todo em cima das suas respostas. Pra ele começar a rodar, é aqui.'}
            </Lede>

            <PlanoCard minutos={minutos} />

            <Grow />
            <Cta disabled={indo} onClick={pagar}>
              {indo ? 'abrindo o pagamento…' : expirado ? 'renovar meu acesso' : 'garantir meu acesso'}
            </Cta>
            {erro && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{erro}</p>
            )}
            <Kicker style={{ textAlign: 'center', marginTop: 10 }}>
              pague via pix · acesso liberado na hora
            </Kicker>

            {/* Quem pagou com OUTRO e-mail cai aqui de novo, porque o acesso é
                casado por e-mail. Sem esta saída a pessoa fica presa numa tela
                de cobrança tendo pago. */}
            {email && (
              <>
                <p style={{
                  margin: '18px 0 0', fontSize: 12, textAlign: 'center', color: 'var(--dk-mute)',
                  fontFamily: 'var(--f-mono)',
                }}>
                  logado como {email}
                </p>
                <Ghost onClick={trocarConta}>
                  {saindo ? 'saindo…' : 'já paguei com outro e-mail · trocar de conta'}
                </Ghost>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
