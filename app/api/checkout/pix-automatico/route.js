import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getPlan } from '../../../../lib/plans';
import { criarAutorizacaoPix, criarCliente, listarClientes } from '../../../../lib/asaas';
import { corpoAutorizacaoPix, documentoValido, soDigitos } from '../../../../lib/asaasPedido';
import { sandboxEmProducao, gravarPedido } from '../../../../lib/asaasCheckout';

export const dynamic = 'force-dynamic';

const PLANO = 'pro-mensal';

/* POST /api/checkout/pix-automatico — o mensal pago por Pix Automático.

   Devolve um QR Code (imagem + copia-e-cola) que, num gesto só, paga o
   primeiro mês e autoriza os próximos no app do banco da pessoa. Daí em diante
   o banco debita todo mês sozinho, até alguém cancelar.

   Por que não é um checkout hospedado como o do cartão: o checkout do Asaas
   não faz Pix recorrente ("CREDIT_CARD is the only payment method allowed for
   RECURRENT operations"). Pix Automático é uma API à parte, e o QR Code aparece
   na NOSSA tela (o popup do plano).

   O Asaas exige CPF/CNPJ pra criar o cliente. Só se pede UMA vez: o cliente
   nasce com `externalReference` = id do usuário, e é por ele que a gente o
   reencontra na próxima. Corpo: { cpf? }. Sem cliente e sem CPF → 422
   `cpf_required`, e a tela mostra o campo. */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* body vazio ok */ }

  const plan = getPlan(PLANO);
  if (!process.env.ASAAS_API_KEY || sandboxEmProducao()) {
    console.error('[pix-automatico] Asaas não configurado (ou chave de sandbox em produção)');
    return NextResponse.json({ error: 'plan_not_configured' }, { status: 500 });
  }

  const admin = createAdminClient();

  try {
    // 1) O cliente no Asaas: o que a gente já criou pra esta conta, ou um novo.
    let cliente = (await listarClientes({ externalReference: user.id })).find((c) => !c?.deleted) || null;
    if (!cliente) {
      const doc = soDigitos(body?.cpf);
      if (!doc) return NextResponse.json({ error: 'cpf_required' }, { status: 422 });
      if (!documentoValido(doc)) return NextResponse.json({ error: 'cpf_invalido' }, { status: 400 });

      let nome = null;
      try {
        const { data } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        nome = data?.full_name || null;
      } catch { /* cai no e-mail */ }

      cliente = await criarCliente({
        name: nome || String(user.email).split('@')[0],
        cpfCnpj: doc,
        email: user.email,
        externalReference: user.id,
        /* Sem e-mail/SMS do Asaas: SMS é cobrado por envio, e no Pix Automático
           quem avisa do débito é o banco da pessoa (regra do Banco Central). */
        notificationDisabled: true,
      });
    }

    // 2) O pedido, antes do QR Code — é ele que o webhook procura.
    const orderId = await gravarPedido(admin, {
      user, planId: PLANO, plan, metodo: 'pix_automatico', customerId: cliente.id,
    });
    if (!orderId) return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });

    // 3) A autorização com o QR Code do primeiro mês.
    const aut = await criarAutorizacaoPix(corpoAutorizacaoPix({ plan, customerId: cliente.id, orderId }));

    try {
      await admin.from('orders').update({ bill_id: aut.id, updated_at: new Date().toISOString() }).eq('id', orderId);
    } catch { /* o webhook ainda acha pelo cliente */ }

    if (!aut?.payload && !aut?.encodedImage) throw new Error('Asaas não devolveu o QR Code');

    return NextResponse.json({
      copiaECola: aut.payload || null,
      imagem: aut.encodedImage ? `data:image/png;base64,${aut.encodedImage}` : null,
      expiraEm: aut.immediateQrCode?.expirationDate || null,
      valor: plan.price / 100,
    });
  } catch (e) {
    console.error('[pix-automatico] erro no Asaas:', e?.status, e?.message, JSON.stringify(e?.erros || []));
    // 400 com o CPF = o Asaas não aceitou o documento.
    if (e?.status === 400 && /cpf|cnpj/i.test(String(e?.message))) {
      return NextResponse.json({ error: 'cpf_invalido' }, { status: 400 });
    }
    return NextResponse.json({ error: 'pix_indisponivel' }, { status: 502 });
  }
}
