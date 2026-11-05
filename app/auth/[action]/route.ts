import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';
import { AuthConfigurationError } from '@/lib/supabase/config';
import { safeReturnPath, sameOriginMutation } from '@/lib/supabase/paths';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers }); }

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (!sameOriginMutation(request)) return json({ error: 'Abre el formulario desde Cotiza para continuar.' }, 403);
  const { action } = await context.params;
  if (!['signin', 'signup', 'recover', 'reset', 'signout'].includes(action)) return json({ error: 'Esta acción no existe.' }, 404);
  try {
    const supabase = await createAuthClient();
    if (action === 'signout') {
      await supabase.auth.signOut({ scope: 'local' });
      const response = NextResponse.redirect(new URL('/acceso', request.url), 303);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'Usa el formulario de Cotiza.' }, 415);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 16_000) return json({ error: 'El formulario es demasiado largo.' }, 413);
    let input: Record<string, unknown>;
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      input = value;
    } catch { return json({ error: 'Revisa los datos del formulario.' }, 400); }
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    const next = safeReturnPath(input.next);
    if (action !== 'reset' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) return json({ error: 'Escribe un correo válido.' }, 400);
    if (action === 'signin') {
      if (!password || password.length > 256) return json({ error: 'Escribe tu contraseña.' }, 400);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return json({ error: error.status === 429 ? 'Hubo varios intentos. Espera un momento y vuelve a probar.' : 'No pudimos iniciar sesión. Revisa el correo y la contraseña, y confirma tu correo si acabas de registrarte.' }, error.status === 429 ? 429 : 401);
      return json({ redirect: next });
    }
    if (action === 'signup' || action === 'reset') {
      if (password.length < 12 || password.length > 256) return json({ error: 'Usa una contraseña de entre 12 y 256 caracteres.' }, 400);
      if (password !== input.confirmPassword) return json({ error: 'Las contraseñas deben coincidir.' }, 400);
    }
    if (action === 'signup') {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (name.length < 2 || name.length > 80) return json({ error: 'Escribe tu nombre, de 2 a 80 caracteres.' }, 400);
      const callback = new URL('/auth/callback', request.url);
      callback.searchParams.set('next', next);
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: callback.toString() } });
      if (error) return json({ error: error.status === 429 ? 'Espera un momento antes de volver a solicitar el correo.' : 'No pudimos completar el registro. Revisa los datos o intenta iniciar sesión si ya tienes una cuenta.' }, error.status === 429 ? 429 : 400);
      if (data.session) return json({ redirect: next });
      return json({ message: 'Revisa tu correo y confirma tu cuenta. Abre el enlace en este mismo navegador para entrar a tu espacio.' });
    }
    if (action === 'recover') {
      const callback = new URL('/auth/callback', request.url);
      callback.searchParams.set('flow', 'recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      if (error) return json({ error: error.status === 429 ? 'Espera un momento antes de pedir otro enlace.' : 'No pudimos solicitar el enlace. Intenta de nuevo en unos minutos.' }, error.status === 429 ? 429 : 400);
      return json({ message: 'Si hay una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña. Ábrelo en este mismo navegador.' });
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'El enlace venció o no es válido. Solicita uno nuevo para continuar.' }, 401);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return json({ error: 'No pudimos actualizar la contraseña. Solicita un enlace nuevo o prueba con otra contraseña.' }, 400);
    return json({ redirect: '/app' });
  } catch (error) {
    if (error instanceof AuthConfigurationError) return json({ error: error.message }, 503);
    return json({ error: 'El acceso no está disponible en este momento. Intenta de nuevo en unos minutos.' }, 503);
  }
}
