import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { identidade, perfilV2 } from '../../../../lib/sessaoServidor';
import { loadMemoryBlock, buildOpeningGreeting } from '../../../../lib/memory';

/* A primeira fala da Cady, personalizada pela memória do usuário.

   POR QUE ISTO VIROU UMA ROTA

   Estava dentro do render de app/v2/(app)/conversar/page.js — ou seja, abrir a
   aba Conversar esperava uma chamada à API da Anthropic (1 a 3 segundos)
   ANTES de mandar o primeiro byte de HTML. Era, de longe, a tela mais lenta do
   app, e a mais usada.

   Duas coisas estavam erradas ali, não uma:

   1. A saudação só é usada quando a conversa COMEÇA. Bloquear a pintura da
      tela por um dado que só importa depois do clique é pagar adiantado por
      algo que talvez nunca seja usado.
   2. Quem só abre a aba pra olhar o histórico e sai gerava uma chamada paga do
      mesmo jeito. Agora a chamada acontece na hora em que a tela monta, em
      paralelo com tudo, e o clique não espera nada.

   Sem memória gravada, `buildOpeningGreeting` já devolvia '' sem chamar a
   Anthropic, e o cliente cai na saudação padrão. Esta rota preserva isso: 200
   com `{ line: '' }` é resposta válida, não erro.

   Não está na lista de exceções do lib/apiAccess.js de propósito: custa token
   da Anthropic, então é conteúdo pago como qualquer outro. */
export async function GET() {
  const eu = await identidade();
  if (!eu) return NextResponse.json({ line: '' }, { status: 401 });

  const supabase = createClient();
  const [perfil, memoryText] = await Promise.all([perfilV2(), loadMemoryBlock(supabase, eu.id)]);
  if (!memoryText) return NextResponse.json({ line: '' });

  const firstName = (perfil?.full_name || '').trim().split(/\s+/)[0] || '';
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const line = await buildOpeningGreeting(supabase, eu.id, firstName, memoryText, { weekday });

  return NextResponse.json({ line: line || '' });
}
