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
    /* Só quem tem 'light' gravado fica no claro; null/auto/legado caem pro
       escuro. Quem decide o padrão de conta nova é o BANCO, não esta linha:
       profiles.theme é `not null default 'dark'` desde a migration 0036. Até
       ela, o default da coluna era 'light' e chegava aqui como escolha
       explícita — o app se dizia escuro por padrão e abria claro. */
    setTheme(profileTheme === 'light' ? 'light' : 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileTheme]);

  return null;
}
