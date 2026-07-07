import { BackHeader } from './BackHeader';

export function HelpArticle({ title, children }) {
  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', padding: '20px 20px 40px', fontFamily: 'var(--font-ui-v2)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <BackHeader title={title} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
