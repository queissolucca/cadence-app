import Link from 'next/link';

// Placeholder da Trilha (feature A1 — a entrada já funciona; a tela real vem na
// C2). Por ora explica o que é e manda pra conversa aberta pra não perder o ritmo.
export default function TrilhaPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Trilha de aprendizagem</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Do B1 ao C1, em lições de 1–2 min de conversa — gramática real, um foco por vez.
        </p>
      </div>

      <div className="v2-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 26 }}>
        <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">🎯</span>
        <strong style={{ fontSize: 16, color: 'var(--v2-card-fg, var(--ink))' }}>Trilha chegando</strong>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 340, lineHeight: 1.55 }}>
          Estou montando as lições B1 e B2 (níveis, gramática e drills de 1–2 min). Enquanto isso, bora de
          conversa aberta pra não perder a cadência.
        </p>
        <Link
          href="/v2/conversar"
          className="v2-card-dark"
          style={{ textDecoration: 'none', border: 'none', padding: '10px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14, marginTop: 2 }}
        >
          Ir pra conversa aberta
        </Link>
      </div>
    </>
  );
}
