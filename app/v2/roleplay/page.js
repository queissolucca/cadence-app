import { createClient } from '../../../lib/supabase/server';
import { RoleplayClient } from '../../../components/v2/RoleplayClient';

export default async function RoleplayPageV2() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_scenario_id, voice_accent')
    .eq('id', user.id)
    .maybeSingle();

  let scenarioTitle = '';
  if (profile?.active_scenario_id) {
    const { data: scenario } = await supabase.from('scenarios').select('title').eq('id', profile.active_scenario_id).maybeSingle();
    scenarioTitle = scenario?.title || '';
  }

  return <RoleplayClient scenarioTitle={scenarioTitle} accent={profile?.voice_accent || 'us'} />;
}
