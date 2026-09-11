'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { respostasGuardadas } from '../../lib/comecar/state';
import { payloadOnboarding } from '../../lib/comecar/paraApi';

/* A REDE QUE SEGURA AS RESPOSTAS QUANDO O CAMINHO ENCURTA.

   O link de confirmação do Supabase passou a levar direto pro /pagamento. Isso é
   o certo pra pessoa — ela confirma o e-mail e cai na cobrança, sem escala —
   mas cria um buraco que não existia: no caminho antigo ela voltava pro
   /comecar, e era LÁ que a tela de conta lia o localStorage e mandava as 33
   respostas pro banco. Indo direto pro /pagamento, esse momento deixa de
   existir e as respostas ficam presas no navegador.

   Então o envio mudou de lugar em vez de sumir: quem chega aqui sem
   `onboarded_at` e com respostas guardadas manda agora. É idempotente (o POST
   é um upsert por user_id) e best-effort — falhar aqui não pode segurar
   ninguém na porta do caixa, e a pessoa continua vendo a tela de pagamento
   normalmente enquanto isso acontece atrás.

   `router.refresh()` depois de salvar existe por um detalhe pequeno: o card de
   preço diz "N minutos por dia" lendo `onboarding.daily_goal`, que acabou de
   nascer. Sem o refresh ele mostraria o genérico de 5 minutos justamente pra
   quem respondeu 10 ou 15.

   Não renderiza nada. */
export function EnviaRespostas({ jaEnviou }) {
  const router = useRouter();
  const rodou = useRef(false);

  useEffect(() => {
    if (jaEnviou || rodou.current) return;
    rodou.current = true;

    const respostas = respostasGuardadas();
    // Sem respostas guardadas não há o que mandar: é o caso de quem veio pelo
    // funil antigo, ou de quem limpou o navegador entre o cadastro e o e-mail.
    if (!respostas || !respostas.nivel) return;

    let vivo = true;
    fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadOnboarding(respostas)),
    })
      .then((r) => { if (vivo && r.ok) router.refresh(); })
      .catch(() => { /* best-effort: a cobrança não depende disto */ });
    return () => { vivo = false; };
  }, [jaEnviou, router]);

  return null;
}
