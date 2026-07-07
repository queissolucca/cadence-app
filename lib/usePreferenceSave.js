'use client';

import { useCallback, useState } from 'react';

// "update otimista + toast discreto" — reusado por toda linha da aba
// Ajustes em vez de cada uma reimplementar o mesmo fetch+feedback.
export function usePreferenceSave() {
  const [toast, setToast] = useState('');

  const save = useCallback(async (payload) => {
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save_failed');
      setToast('Salvo');
    } catch {
      setToast('Não consegui salvar agora');
    }
    setTimeout(() => setToast(''), 1600);
  }, []);

  return { toast, save };
}
