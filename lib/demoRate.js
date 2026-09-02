import { createAdminClient } from './supabase/admin';

// Rate-limit do demo público (por IP, por hora). Best-effort: se a tabela não
// existe ainda, não bloqueia (deixa passar).
export function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for') || '';
  return (xf.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 60) || 'unknown';
}

export async function allowDemo(request, kind, maxPerHour) {
  const ip = clientIp(request);
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count, error } = await admin
      .from('demo_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('kind', kind)
      .gte('created_at', since);
    if (error) return { ok: true, ip }; // tabela ausente / erro → não bloqueia
    if (typeof count === 'number' && count >= maxPerHour) return { ok: false, ip };
    await admin.from('demo_events').insert({ ip, kind });
    return { ok: true, ip };
  } catch {
    return { ok: true, ip };
  }
}
