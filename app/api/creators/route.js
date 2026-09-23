import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { validarCreator, limparCreator, NICHO_OUTROS } from '../../../lib/creators';

export const dynamic = 'force-dynamic';

// Mesmo aviso por e-mail do feedback — best-effort via Resend, só roda se
// RESEND_API_KEY + FEEDBACK_EMAIL_TO estiverem setados no Vercel.
async function emailOwner(c) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL_TO;
  if (!key || !to) return;
  const from = process.env.FEEDBACK_EMAIL_FROM || 'Cadence Feedback <onboarding@resend.dev>';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to, reply_to: c.email, subject: `[Cadence] Para Creators — ${c.instagram}`, text: resumo(c) }),
    });
  } catch {
    /* best-effort — nunca derruba o request */
  }
}

function resumo(c) {
  const nichos = c.nichos.map((n) => (n === NICHO_OUTROS ? `Outros: ${c.nicho_outro}` : n)).join(', ');
  return `[Para Creators]\nE-mail: ${c.email}\nTelefone: (${c.ddd}) ${c.telefone}\nInstagram: ${c.instagram}\nNichos: ${nichos}`;
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const erros = validarCreator(body);
  if (Object.keys(erros).length) return NextResponse.json({ error: 'invalid_fields', fields: erros }, { status: 400 });

  const c = limparCreator(body);

  // Sem a migration 0039 a tabela creators não existe: aí o pedido cai na
  // tabela feedback (que já existe) como texto, pra nada se perder.
  const { error } = await supabase.from('creators').insert({ user_id: user.id, ...c });
  if (error) {
    const fallback = await supabase.from('feedback').insert({ user_id: user.id, message: resumo(c) });
    if (fallback.error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  await emailOwner(c);

  return NextResponse.json({ ok: true });
}
