import { redirect } from 'next/navigation';

// Idem app/cadence/page.js — essa demo virou /experimentar.
export default function CadenceOnboardingLegacyRedirect() {
  redirect('/experimentar');
}
