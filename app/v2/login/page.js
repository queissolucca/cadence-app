import { redirect } from 'next/navigation';

// Login virou rota top-level (ver app/login/page.js) — só mantém esse
// redirect pra não quebrar links/bookmarks antigos pra /v2/login.
export default function LoginPageV2() {
  redirect('/login');
}
