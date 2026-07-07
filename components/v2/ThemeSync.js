'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// next-themes por padrão só persiste em localStorage (por dispositivo).
// profiles.theme é a fonte de verdade entre dispositivos — isso aplica o
// valor salvo no banco assim que a página carrega, sem esperar o usuário
// tocar em nada.
export function ThemeSync({ profileTheme }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (profileTheme) {
      setTheme(profileTheme === 'auto' ? 'system' : profileTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileTheme]);

  return null;
}
