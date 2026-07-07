import { createClient } from '../../../../lib/supabase/server';
import { SectionHead } from '../../../../components/ui';
import { AjustesClient } from '../../../../components/v2/AjustesClient';

export default async function AjustesPageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, weekly_cadence_target, session_duration, correction_timing, correction_depth, voice_accent, audio_speed, pronunciation_strictness, theme, reminder_enabled, reminder_time')
    .eq('id', user.id)
    .single();

  return (
    <>
      <SectionHead title="Ajustes" />
      <AjustesClient profile={profile} email={user.email} />
    </>
  );
}
