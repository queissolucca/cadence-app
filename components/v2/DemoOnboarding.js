'use client';

import { useState } from 'react';
import { DemoVoice } from './DemoVoice';
import { DemoText } from './DemoText';

// Experiência pré-cadastro (/inicio/onboarding): a pessoa escolhe FALAR (voz,
// agente demo do ElevenLabs, ~30s) ou ESCREVER (Claude), sente a Cady, e é
// convidada a criar a conta. Público, sem login.
export function DemoOnboarding() {
  const [mode, setMode] = useState(null); // null | 'voice' | 'text'
  const [ended, setEnded] = useState(false);

  const back = () => { setMode(null); setEnded(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>C</span>
        <div>
          <strong style={{ fontSize: 14.5, color: 'var(--ink)', display: 'block' }}>Cady</strong>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>sua professora de inglês</span>
        </div>
      </div>

      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>Experimente a Cady — 30 segundos</h2>
            <p style={{ margin: '7px 0 0', fontSize: 13.5, color: 'var(--ink-soft)' }}>Sem cadastro. Sinta como é aprender conversando.</p>
          </div>

          <button type="button" onClick={() => setMode('voice')} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid var(--green)', background: 'var(--green-soft)', borderRadius: 18, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}>
            <span style={{ position: 'absolute', top: -9, right: 14, background: 'var(--green)', color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 999 }}>recomendado</span>
            <span style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </span>
            <span><b style={{ fontSize: 16 }}>Falar com a Cady</b><br /><small style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>use o microfone e converse de verdade</small></span>
          </button>

          <button type="button" onClick={() => setMode('text')} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid var(--line)', background: 'var(--v2-card-bg)', borderRadius: 18, padding: '18px 16px', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}>
            <span style={{ width: 46, height: 46, borderRadius: 14, background: '#16231C', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </span>
            <span><b style={{ fontSize: 16 }}>Escrever</b><br /><small style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>prefere digitar? também dá</small></span>
          </button>

          <a href="/login" style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-soft)', textDecoration: 'none', marginTop: 2 }}>pular e criar conta →</a>
        </div>
      )}

      {mode && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button type="button" onClick={back} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 0 10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            trocar modo
          </button>

          {mode === 'voice' ? <DemoVoice onEnd={() => setEnded(true)} /> : <DemoText onEnd={() => setEnded(true)} />}

          {ended && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 16.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.35, maxWidth: 380, color: 'var(--ink)' }}>
                Imagina isso <span style={{ color: 'var(--green-dark, var(--green))' }}>todo dia</span> — só <span style={{ color: 'var(--green-dark, var(--green))' }}>10 minutos por dia</span> — até você falar sem travar.
              </p>
              <a href="/login" style={{ width: '100%', maxWidth: 360, textAlign: 'center', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 15, padding: 16, fontWeight: 800, fontSize: 15.5, cursor: 'pointer', textDecoration: 'none' }}>
                Quero destravar meu inglês agora!
              </a>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>leva 1 minuto pra começar</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
