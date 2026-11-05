import 'server-only';
import { redirect } from 'next/navigation';
import { createAuthClient } from './supabase/server';
import { safeReturnPath } from './supabase/paths';
import { authConfigured } from './supabase/config';

export type AuthUser = { userId: string; displayName: string; email: string };

export async function getUser(): Promise<AuthUser | null> {
  if (!authConfigured()) return null;
  const supabase = await createAuthClient();
  // A cookie's user object is untrusted. Supabase verifies this session with its Auth server.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id || !user.email) return null;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim().slice(0, 80) : '';
  return { userId: user.id, email: user.email, displayName: name || user.email };
}

export async function requireUser(returnTo = '/app'): Promise<AuthUser> {
  const user = await getUser();
  if (user) return user;
  redirect(`/acceso?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
}
