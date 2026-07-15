import { redirect } from 'next/navigation';

// Idem app/cadence/page.js — essa demo virou /inicio/onboarding.
export default function CadenceOnboardingLegacyRedirect() {
  redirect('/inicio/onboarding');
}
