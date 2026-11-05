import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';
import { safeReturnPath } from '@/lib/supabase/paths';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code && code.length <= 2048) {
    try {
      const supabase = await createAuthClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const target = url.searchParams.get('flow') === 'recovery' ? '/acceso/actualizar' : safeReturnPath(url.searchParams.get('next'));
        const response = NextResponse.redirect(new URL(target, url.origin), 303);
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Referrer-Policy', 'no-referrer');
        return response;
      }
    } catch { /* Show a useful recovery screen without leaking provider details. */ }
  }
  const response = NextResponse.redirect(new URL('/acceso?error=enlace', url.origin), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
