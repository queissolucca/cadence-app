import { TrilhaView } from '../../../../components/v2/TrilhaView';

// C2 — a tela da trilha: escolhe nível (B1/B2) e navega os módulos → lições.
export default function TrilhaPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--ink)' }}>Trilha de aprendizagem</h1>
        <p style={{ margin: '6px 0 18px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Do B1 ao C1, uma lição de 1–2 min por vez. Escolha o nível e explore os módulos.
        </p>
      </div>
      <TrilhaView />
    </>
  );
}
