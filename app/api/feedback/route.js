import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

// Envia o feedback pro e-mail do dono do app — best-effort via Resend. Só roda
// se RESEND_API_KEY + FEEDBACK_EMAIL_TO estiverem setados no Vercel; senão, o
// feedback fica só no Supabase (que já é a base organizada por datetime).
async function emailOwner({ rating, message, email }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_EMAIL_TO;
  if (!key || !to) return;
  const from = process.env.FEEDBACK_EMAIL_FROM || 'Cadence Feedback <onboarding@resend.dev>';
  const stars = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '(sem nota)';
  const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to,
        reply_to: email || undefined,
        subject: `[Cadence] Feedback ${rating ? `${rating}★ ` : ''}— ${email || 'usuário'}`,
        text: `Avaliação: ${stars}\nDe: ${email || '—'}\nQuando: ${when} (Brasília)\n\nMensagem:\n${message || '(sem mensagem)'}`,
      }),
    });
  } catch {
    /* best-effort — nunca derruba o request */
  }
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

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';
  const n = Number(body.rating);
  const rating = Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;

  if (!message && !rating) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  // Tenta com as colunas novas (rating, email). Se a migration 0019 não rodou,
  // cai pro insert básico (message not-null), sintetizando a nota como texto.
  const row = { user_id: user.id, message: message || null, email: user.email || null };
  if (rating) row.rating = rating;

  let error = null;
  const withNew = await supabase.from('feedback').insert(row);
  if (withNew.error) {
    const fallbackMsg = message || (rating ? `[${rating}★]` : '');
    if (fallbackMsg) {
      const basic = await supabase.from('feedback').insert({ user_id: user.id, message: fallbackMsg });
      error = basic.error;
    } else {
      error = withNew.error;
    }
  }
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  await emailOwner({ rating, message, email: user.email });

  return NextResponse.json({ ok: true });
}
