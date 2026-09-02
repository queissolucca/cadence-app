import { NextResponse } from 'next/server';
import { allowDemo } from '../../../../lib/demoRate';

export const dynamic = 'force-dynamic';

// Signed URL do agente DEMO (pré-cadastro, sem login). O agente demo tem cap de
// ~30s no ElevenLabs, e aqui tem rate-limit por IP — dupla proteção contra abuso.
export async function GET(request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_DEMO_AGENT_ID;
  if (!apiKey || !agentId) return NextResponse.json({ error: 'demo_not_configured' }, { status: 503 });

  const gate = await allowDemo(request, 'voice', 3); // até 3 tentativas de voz por hora/IP
  if (!gate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey }, cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json({ error: 'signed_url_failed' }, { status: 502 });
    const data = await res.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch {
    return NextResponse.json({ error: 'signed_url_failed' }, { status: 502 });
  }
}
