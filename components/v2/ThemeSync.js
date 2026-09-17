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
    /* Só quem tem 'dark' gravado fica no escuro; null/auto/legado caem pro
       claro. Quem decide o padrão de conta nova é o BANCO, não esta linha:
       profiles.theme voltou a ser `default 'light'` na migration 0037. As duas
       pontas têm que concordar — foi a discordância entre elas que fez o app
       se dizer escuro por padrão e abrir claro durante meses. */
    setTheme(profileTheme === 'dark' ? 'dark' : 'light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileTheme]);

  return null;
}
