'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Target, Clock, MessageSquare, AlignLeft, Mic, Gauge, Volume2, Palette, Bell,
  HelpCircle, BookOpen, Send, ShieldCheck, LogOut, ChevronRight,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { usePreferenceSave } from '../../lib/usePreferenceSave';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { Toast } from './Toast';

function RowIcon({ Icon }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Icon size={16} strokeWidth={1.8} />
    </div>
  );
}

function Row({ icon, label, valueLabel, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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
const CORRECTION_TIMING_OPTIONS = [
  { value: 'inline', title: 'Durante o exercício', desc: 'Feedback imediato a cada resposta.' },
  { value: 'end_of_exercise', title: 'Só no final', desc: 'A conversa flui, correções agrupadas ao terminar.' },
];
const STRICTNESS_OPTIONS = [
  { value: 'low', title: 'Baixo', desc: 'Bem tolerante com imperfeições da transcrição de voz.' },
  { value: 'medium', title: 'Médio', desc: 'Considera que a transcrição pode errar, mas ainda marca erros reais.' },
  { value: 'high', title: 'Alto', desc: 'Mesmo rigor de uma resposta escrita.' },
];

export function AjustesClient({ profile, email }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast, save } = usePreferenceSave();

  const [state, setState] = useState({
    weeklyCadence: profile?.weekly_cadence_target || 5,
    sessionDuration: profile?.session_duration || 8,
    correctionTiming: profile?.correction_timing || 'inline',
    correctionDepth: profile?.correction_depth || 'explain_always',
    voiceAccent: profile?.voice_accent || 'us',
    audioSpeed: profile?.audio_speed || 1.0,
    pronunciationStrictness: profile?.pronunciation_strictness || 'medium',
    themePref: profile?.theme || 'light',
    reminderEnabled: profile?.reminder_enabled ?? true,
    reminderTime: (profile?.reminder_time || '08:00').slice(0, 5),
  });

  const [sheet, setSheet] = useState(null); // 'weekly' | 'timing' | 'strictness' | 'reminder' | null
  const [signingOut, setSigningOut] = useState(false);

  const update = async (key, apiKey, value) => {
    setState((prev) => ({ ...prev, [key]: value }));
    await save({ [apiKey]: value });
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
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '4px 10px' }}>Grátis</span>
      </div>

      {/* Prática */}
      <Group title="Prática">
        <Row icon={Target} label="Meta semanal" valueLabel={WEEKLY_LABEL(state.weeklyCadence)} onClick={() => setSheet('weekly')} />
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <RowIcon Icon={Clock} />
            <span style={{ fontSize: 14 }}>Duração da sessão</span>
          </div>
          <SegmentedControl
            options={[{ value: 5, label: '5 min' }, { value: 8, label: '8 min' }, { value: 12, label: '12 min' }]}
            value={state.sessionDuration}
            onChange={(v) => update('sessionDuration', 'sessionDuration', v)}
          />
        </div>
        <Row
          icon={MessageSquare}
          label="Quando corrigir"
          valueLabel={CORRECTION_TIMING_OPTIONS.find((o) => o.value === state.correctionTiming)?.title}
          onClick={() => setSheet('timing')}
        />
        <div style={{ padding: '12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <RowIcon Icon={AlignLeft} />
            <span style={{ fontSize: 14 }}>Profundidade da correção</span>
          </div>
          <SegmentedControl
            options={[{ value: 'explain_always', label: 'Sempre explicar' }, { value: 'flag_only', label: 'Só apontar' }]}
            value={state.correctionDepth}
            onChange={(v) => update('correctionDepth', 'correctionDepth', v)}
          />
        </div>
      </Group>

      {/* Fala e áudio */}
      <Group title="Fala e áudio">
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <RowIcon Icon={Mic} />
            <span style={{ fontSize: 14 }}>Sotaque da voz</span>
          </div>
          <SegmentedControl
            options={[{ value: 'us', label: 'US' }, { value: 'uk', label: 'UK' }]}
            value={state.voiceAccent}
            onChange={(v) => update('voiceAccent', 'voiceAccent', v)}
          />
        </div>
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <RowIcon Icon={Gauge} />
            <span style={{ fontSize: 14 }}>Velocidade do áudio</span>
          </div>
          <SegmentedControl
            options={[{ value: 0.75, label: '0.75x' }, { value: 1.0, label: '1x' }]}
            value={state.audioSpeed}
            onChange={(v) => update('audioSpeed', 'audioSpeed', v)}
          />
        </div>
        <Row
          icon={Volume2}
          label="Rigor da pronúncia"
          valueLabel={STRICTNESS_OPTIONS.find((o) => o.value === state.pronunciationStrictness)?.title}
          onClick={() => setSheet('strictness')}
        />
      </Group>

      {/* Aparência e avisos */}
      <Group title="Aparência e avisos">
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
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
        <div style={{ padding: '12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RowIcon Icon={Bell} />
            <span style={{ flex: 1, fontSize: 14 }}>Lembrete diário</span>
            <button
              type="button"
              onClick={() => update('reminderEnabled', 'reminderEnabled', !state.reminderEnabled)}
              style={{
                width: 42, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
                background: state.reminderEnabled ? 'var(--green)' : 'var(--v2-badge-neutral-bg)',
              }}
              aria-pressed={state.reminderEnabled}
            >
              <span style={{
                position: 'absolute', top: 3, left: state.reminderEnabled ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
                background: '#fff', transition: 'left .15s ease',
              }} />
            </button>
          </div>
          {state.reminderEnabled && (
            <button type="button" onClick={() => setSheet('reminder')} style={{ marginTop: 8, marginLeft: 40, fontSize: 12.5, color: 'var(--green-dark)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              todo dia às {state.reminderTime}
            </button>
          )}
        </div>
      </Group>

      {/* Ajuda */}
      <Group title="Ajuda">
        <Row icon={HelpCircle} label="Como funciona a memória espaçada" onClick={() => router.push('/v2/ajuda/memoria-espacada')} />
        <Row icon={BookOpen} label="Guia de boas práticas" onClick={() => router.push('/v2/ajuda/boas-praticas')} />
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

      <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono-v2)', fontSize: 11, color: 'var(--ink-soft)' }}>cadence v1.4.0</p>

      {/* TODO: disparo real do lembrete diário (push/e-mail) fica pra depois.
          Estratégia planejada: Vercel Cron (ex: a cada hora, de hora em
          hora) consultando profiles onde reminder_enabled=true e
          reminder_time cai na janela atual (convertido de America/Sao_Paulo
          pra UTC), disparando e-mail via Resend. Hoje só persiste a
          preferência, sem enviar nada. */}

      <BottomSheet open={sheet === 'weekly'} onClose={() => setSheet(null)} title="Meta semanal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <button
            type="button"
            onClick={() => update('weeklyCadence', 'weeklyCadence', Math.max(3, state.weeklyCadence - 1))}
            style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--line)', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--v2-card-fg)' }}
          >
            −
          </button>
          <strong style={{ fontSize: 28, fontFamily: 'var(--font-mono-v2)' }}>{state.weeklyCadence}</strong>
          <button
            type="button"
            onClick={() => update('weeklyCadence', 'weeklyCadence', Math.min(7, state.weeklyCadence + 1))}
            style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--line)', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--v2-card-fg)' }}
          >
            +
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--ink-soft)' }}>dias por semana</p>
      </BottomSheet>

      <BottomSheet open={sheet === 'timing'} onClose={() => setSheet(null)} title="Quando corrigir">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CORRECTION_TIMING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { update('correctionTiming', 'correctionTiming', opt.value); setSheet(null); }}
              style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 12,
                border: state.correctionTiming === opt.value ? '1.5px solid var(--green)' : '1px solid var(--line)',
                background: state.correctionTiming === opt.value ? 'var(--green-soft)' : 'transparent',
                color: 'var(--v2-card-fg)',
              }}
            >
              <strong style={{ display: 'block', fontSize: 14 }}>{opt.title}</strong>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'strictness'} onClose={() => setSheet(null)} title="Rigor da pronúncia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STRICTNESS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { update('pronunciationStrictness', 'pronunciationStrictness', opt.value); setSheet(null); }}
              style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: 12,
                border: state.pronunciationStrictness === opt.value ? '1.5px solid var(--green)' : '1px solid var(--line)',
                background: state.pronunciationStrictness === opt.value ? 'var(--green-soft)' : 'transparent',
                color: 'var(--v2-card-fg)',
              }}
            >
              <strong style={{ display: 'block', fontSize: 14 }}>{opt.title}</strong>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'reminder'} onClose={() => setSheet(null)} title="Horário do lembrete">
        <input
          type="time"
          value={state.reminderTime}
          onChange={(e) => update('reminderTime', 'reminderTime', e.target.value)}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: 12, fontSize: 16, color: 'var(--v2-card-fg)', background: 'var(--v2-card-bg)' }}
        />
        <button type="button" onClick={() => setSheet(null)} className="v2-card-dark" style={{ width: '100%', border: 'none', marginTop: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Pronto
        </button>
      </BottomSheet>

      <Toast message={toast} />
    </>
  );
}
