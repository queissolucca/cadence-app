'use client';

import { useEffect } from 'react';

// Trava o zoom (pinch, double-tap, ctrl+scroll, ctrl +/-) em todo o app, mas
// mantém o scroll vertical/horizontal normal. iOS Safari ignora o
// `user-scalable=no` do viewport, por isso os listeners JS aqui.
export function ZoomLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.touchAction;
    const prevBody = body.style.touchAction;
    // pan-x pan-y = permite arrastar/scrollar, mas bloqueia pinch e double-tap zoom.
    html.style.touchAction = 'pan-x pan-y';
    body.style.touchAction = 'pan-x pan-y';

    const prevent = (e) => e.preventDefault();
    // Pinch do iOS Safari (gesture events).
    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    document.addEventListener('gestureend', prevent, { passive: false });

    // Pinch com 2+ dedos (fallback).
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    // Desktop: ctrl/⌘ + scroll e ctrl/⌘ + (+/-/0/=).
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    document.addEventListener('wheel', onWheel, { passive: false });
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', onKey, { passive: false });

    return () => {
      html.style.touchAction = prevHtml;
      body.style.touchAction = prevBody;
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
