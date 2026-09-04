import { redirect } from 'next/navigation';

// A landing page virou a raiz (/) — mantém só esse redirect pra não quebrar
// links/bookmarks antigos pra /cadence.
export default function CadenceLegacyRedirect() {
  redirect('/');
}
