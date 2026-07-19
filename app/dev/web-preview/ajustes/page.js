import { SectionHead } from '../../../../components/ui';
import { AjustesClient } from '../../../../components/v2/AjustesClient';
import { MOCK_PROFILE } from '../_mock';

export default function AjustesWebPreviewPage() {
  return (
    <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Ajustes" />
      <AjustesClient profile={MOCK_PROFILE} email="lucca@exemplo.com" />
    </div>
  );
}
