import { PracticeSession } from '../../../../../components/v2/PracticeSession';
import { MOCK_PROFILE, MOCK_QUEUE_SPEAKING } from '../../_mock';

export default function PraticarSpeakingWebPreviewPage() {
  return (
    <PracticeSession
      mode="speaking"
      headerTitle="Speaking"
      initialQueue={MOCK_QUEUE_SPEAKING}
      profile={MOCK_PROFILE}
      otherModeHref="/dev/web-preview/praticar/writing"
      otherModeLabel="Writing"
      homeHref="/dev/web-preview"
    />
  );
}
