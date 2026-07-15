import { redirect } from 'next/navigation';

// A raiz do site é só a v2 agora — o fluxo antigo (LoginScreen/Diagnostic/
// CadenceApp) fica com os arquivos intactos mas sem rota que leve até ele,
// pra nunca mais servir por engano a versão desatualizada do app.
// /v2 já tem seu próprio guard de auth no middleware (sem sessão → /login).
export default function Page() {
  redirect('/v2');
}
