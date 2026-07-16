'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

const linkBtnStyle = {
  border: 'none', background: 'none', color: 'var(--ink-soft)', textDecoration: 'underline',
  cursor: 'pointer', padding: 0, fontSize: 12.5, fontFamily: 'inherit', display: 'block', margin: '14px auto 0', textAlign: 'center', width: '100%',
};

export function TrocarLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading} style={linkBtnStyle}>
      {loading ? 'saindo…' : 'voltar e trocar de login'}
    </button>
  );
}
