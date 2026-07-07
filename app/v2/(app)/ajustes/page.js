'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/client';
import { SectionHead, Card } from '../../../../components/ui';

export default function AjustesPageV2() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/v2/login');
    router.refresh();
  };

  return (
    <>
      <SectionHead title="Ajustes" />
      <Card>
        <p style={{ margin: '0 0 14px', color: 'var(--ink-soft)', fontSize: 14 }}>
          Preferências de voz, correção e lembretes — construído numa próxima etapa.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '11px 16px', background: '#fff', color: 'var(--red)', fontWeight: 700, fontSize: 14 }}
        >
          {signingOut ? 'Saindo…' : 'Sair'}
        </button>
      </Card>
    </>
  );
}
