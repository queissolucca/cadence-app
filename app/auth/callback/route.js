import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// Google redirects here with a `code` after the user approves the OAuth
// consent screen; we exchange it for a Supabase session cookie.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
