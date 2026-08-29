'use client';

import { ThemeProvider } from 'next-themes';

// attribute="class" alterna a classe "dark" no <html> — só as telas em /v2
// (que usam os tokens --v2-*/--bg/--ink/etc.) reagem a ela; o resto do app
// nunca referencia essa classe, então fica inerte a isso.
export function ThemeProviderV2({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
