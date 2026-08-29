'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Target, Palette, Send, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { usePreferenceSave } from '../../lib/usePreferenceSave';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { Toast } from './Toast';

// Ajustes enxuto pro app voice-first: só o que realmente funciona hoje —
// perfil, meta semanal (que alimenta a sequência da aba Hoje), tema, ajuda e
// logout. Os antigos ajustes de prática (duração de sessão, "quando corrigir",
// profundidade), o grupo "Fala e áudio" (sotaque/velocidade do TTS do
// navegador, que o agente do ElevenLabs substituiu) e o lembrete diário (que
// só persistia, sem disparar nada) saíram. A configuração de persona e estilo
// de feedback volta na Fase 1, aí de verdade plugada no agente.

function RowIcon({ Icon }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Icon size={16} strokeWidth={1.8} />
    </div>
  );
}

function Row({ icon, label, valueLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', border: 'none',
        borderBottom: '1px solid var(--line)', background: 'none', cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      }}
    >
      <RowIcon Icon={icon} />
      <span style={{ flex: 1, fontSize: 14, color: 'var(--v2-card-fg)' }}>{label}</span>
      {valueLabel && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{valueLabel}</span>}
      {onClick && <ChevronRight size={16} color="var(--ink-soft)" />}
    </button>
  );
}

function Group({ title, children }) {
  return (
    <div className="v2-card">
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

const WEEKLY_LABEL = (n) => `${n} dias/sem`;

export function AjustesClient({ profile, email }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { toast, save } = usePreferenceSave();

  const [state, setState] = useState({
    weeklyCadence: profile?.weekly_cadence_target || 5,
    themePref: profile?.theme || 'light',
  });
  const [sheet, setSheet] = useState(null); // 'weekly' | null
  const [signingOut, setSigningOut] = useState(false);

  const setWeekly = async (value) => {
    setState((prev) => ({ ...prev, weeklyCadence: value }));
    await save({ weeklyCadence: value });
  };

  const changeTheme = async (value) => {
    setState((prev) => ({ ...prev, themePref: value }));
    setTheme(value === 'auto' ? 'system' : value);
    await save({ theme: value });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Perfil */}
      <div className="v2-card-dark" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
          {(profile?.full_name || email || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.full_name || 'Sem nome ainda'}
          </strong>
          <span style={{ display: 'block', fontSize: 12.5, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
        </div>
      </div>

      {/* Treino */}
      <Group title="Treino">
        <Row icon={Target} label="Meta semanal" valueLabel={WEEKLY_LABEL(state.weeklyCadence)} onClick={() => setSheet('weekly')} />
      </Group>

      {/* Aparência */}
      <Group title="Aparência">
        <div style={{ padding: '12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <RowIcon Icon={Palette} />
            <span style={{ fontSize: 14 }}>Tema</span>
          </div>
          <SegmentedControl
            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }, { value: 'auto', label: 'Auto' }]}
            value={state.themePref}
            onChange={changeTheme}
          />
        </div>
      </Group>

      {/* Ajuda */}
      <Group title="Ajuda">
        <Row icon={Send} label="Enviar feedback" onClick={() => router.push('/v2/ajuda/feedback')} />
        <Row icon={ShieldCheck} label="Privacidade e dados" onClick={() => router.push('/v2/ajuda/privacidade')} />
      </Group>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="v2-card"
        style={{ border: '1px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--red)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
      >
        <LogOut size={16} />
        {signingOut ? 'Saindo…' : 'Sair da conta'}
      </button>

      <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono-v2)', fontSize: 11, color: 'var(--ink-soft)' }}>cadence v1.5.0</p>

      <BottomSheet open={sheet === 'weekly'} onClose={() => setSheet(null)} title="Meta semanal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <button
            type="button"
            onClick={() => setWeekly(Math.max(3, state.weeklyCadence - 1))}
            style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--line)', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--v2-card-fg)' }}
          >
            −
          </button>
          <strong style={{ fontSize: 28, fontFamily: 'var(--font-mono-v2)' }}>{state.weeklyCadence}</strong>
          <button
            type="button"
            onClick={() => setWeekly(Math.min(7, state.weeklyCadence + 1))}
            style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--line)', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--v2-card-fg)' }}
          >
            +
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--ink-soft)' }}>dias por semana</p>
      </BottomSheet>

      <Toast message={toast} />
    </>
  );
}
