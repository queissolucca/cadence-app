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
    .select('full_name, weekly_cadence_target, theme')
    .eq('id', user.id)
    .single();

  return (
    <div className="web-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Ajustes" />
      <AjustesClient profile={profile} email={user.email} />
    </div>
  );
}
