'use client';

import { ThemeProvider } from 'next-themes';

// Claro por padrão, de novo. Foi escuro por três dias (migrations 0036) e
// voltou: o onboarding inteiro virou claro/vidro, e entrar no app era cair
// num buraco preto logo depois de 32 telas de papel.
// Quem escolheu escuro em Ajustes continua no escuro (profiles.theme, aplicado
// pelo ThemeSync).
//
// Este defaultTheme cobre só o instante antes do ThemeSync rodar. O padrão de
// verdade de uma conta nova é o default da coluna profiles.theme (migration
// 0037) — os dois têm que dizer a mesma coisa, ou a tela abre de um jeito e
// vira de outro meio segundo depois.
//
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
