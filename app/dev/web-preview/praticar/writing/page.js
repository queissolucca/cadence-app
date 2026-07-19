import { PracticeSession } from '../../../../../components/v2/PracticeSession';
import { MOCK_PROFILE, MOCK_QUEUE_WRITING } from '../../_mock';

export default function PraticarWritingWebPreviewPage() {
  return (
    <PracticeSession
      mode="writing"
      headerTitle="Writing"
      initialQueue={MOCK_QUEUE_WRITING}
      profile={MOCK_PROFILE}
      otherModeHref="/dev/web-preview/praticar/speaking"
      otherModeLabel="Speaking"
      homeHref="/dev/web-preview"
    />
  );
}
