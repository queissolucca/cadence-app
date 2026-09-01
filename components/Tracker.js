'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Registra as movimentações do usuário logado: cada troca de aba/rota vira um
// 'pageview' (com horário ao segundo, user_id, UTM e referrer). Também expõe
// window.cadenceTrack(event, meta) pra logar ações específicas (ex.: clicou em
// ajustes, alterou algo). Best-effort, nunca atrapalha a navegação.
function readUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    const u = { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') };
    if (u.source || u.medium || u.campaign) {
      sessionStorage.setItem('cadence_utm', JSON.stringify(u));
      return u;
    }
    const saved = sessionStorage.getItem('cadence_utm');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function send(event, path, meta) {
  let referrer = null;
  try { referrer = document.referrer || null; } catch { /* noop */ }
  try {
    fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ event, path, utm: readUtm(), referrer, meta: meta || null }),
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

export function Tracker() {
  const pathname = usePathname();
  const last = useRef(null);

  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    send('pageview', pathname);
  }, [pathname]);

  useEffect(() => {
    window.cadenceTrack = (event, meta) => send(String(event || 'event'), window.location.pathname, meta);
    return () => { try { delete window.cadenceTrack; } catch { /* noop */ } };
  }, []);

  return null;
}
