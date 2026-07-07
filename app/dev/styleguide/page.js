'use client';

// Página temporária pra visualizar os tokens/componentes da fundação v2
// antes de qualquer tela real ser refeita em cima deles. Não linkada de
// lugar nenhum do app — acesso só por URL direta.

import { Card, CardDark, CardGreen, Pill, Badge, SectionHead, ProgressBar, TabBar, AppHeader } from '../../../components/ui';

export default function StyleguidePage() {
  return (
    <div className="v2-bg" style={{ minHeight: '100vh', padding: '24px 20px 100px', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        <AppHeader streak={12} avatarInitial="L" />

        <section>
          <h3 style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 10 }}>Tokens</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['--bg', 'var(--bg)'],
              ['--ink', 'var(--ink)'],
              ['--ink-soft', 'var(--ink-soft)'],
              ['--green', 'var(--green)'],
              ['--green-dark', 'var(--green-dark)'],
              ['--green-soft', 'var(--green-soft)'],
              ['--line', 'var(--line)'],
              ['--red', 'var(--red)'],
            ].map(([name, value]) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 44, borderRadius: 10, background: value, border: '1px solid var(--line)' }} />
                <span style={{ fontFamily: 'var(--font-mono-v2)', fontSize: 10, color: 'var(--ink-soft)' }}>{name}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHead title="SectionHead" right="12/20 hoje" />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card>
            <strong style={{ display: 'block', marginBottom: 6 }}>Card</strong>
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>Fundo branco, borda line, rounded-card.</p>
          </Card>
          <CardDark>
            <strong style={{ display: 'block', marginBottom: 6 }}>CardDark</strong>
            <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>Fundo ink, texto branco.</p>
          </CardDark>
          <CardGreen>
            <strong style={{ display: 'block', marginBottom: 6 }}>CardGreen</strong>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Fundo green, texto branco.</p>
          </CardGreen>
        </section>

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Pill dot>8 min · 6 itens</Pill>
          <Pill>sem ponto</Pill>
          <Badge variant="new">novo</Badge>
          <Badge variant="rev">revisão</Badge>
          <Badge variant="neutral">neutro</Badge>
          <Badge variant="due">vencido</Badge>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ProgressBar value={35} />
          <ProgressBar value={70} />
          <ProgressBar value={100} />
        </section>

      </div>

      <TabBar active="hoje" />
    </div>
  );
}
