import { TabBar } from '../../../components/ui';

export default function AppLayoutV2({ children }) {
  return (
    <div className="v2-bg" style={{ minHeight: '100dvh', fontFamily: 'var(--font-ui-v2)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 20px 96px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </div>
      <TabBar basePath="/v2" />
    </div>
  );
}
