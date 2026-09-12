import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { idDoAgente } from '../../../../lib/agentesVoz';

// Mint de signed URL pra sessão de voz do ElevenLabs Conversational AI.
// A API key NUNCA vai pro cliente — fica só aqui no server. O signed URL
// vale 15 min pra ABRIR a conversa (a conversa em si pode durar mais).
//
// Gate de sessão: só usuário logado consegue um URL, senão qualquer um
// poderia queimar seus minutos do ElevenLabs batendo nessa rota.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  /* A voz vem por CHAVE ('cadi', 'tranquila'), nunca por id. Um `agent_id`
     aceito do cliente deixaria qualquer pessoa logada abrir qualquer agente da
     conta do ElevenLabs com um parâmetro de query — e cada minuto é cobrado.
     Chave desconhecida cai na padrão; ver lib/agentesVoz.js. */
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = idDoAgente(request.nextUrl.searchParams.get('agente'));
  if (!apiKey || !agentId) {
    return NextResponse.json({ error: 'elevenlabs_not_configured' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey }, cache: 'no-store' },
    );
    if (!res.ok) {
      return NextResponse.json({ error: 'signed_url_failed' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch {
    return NextResponse.json({ error: 'signed_url_failed' }, { status: 502 });
  }
}
