'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Loader2, LockKeyhole } from 'lucide-react';

export type AuthMode = 'signin' | 'signup' | 'recover' | 'reset';
const labels = { signin: 'Entrar a mi espacio', signup: 'Crear mi cuenta', recover: 'Enviar enlace', reset: 'Guardar nueva contraseña' };

export default function AuthForm({ mode, next, configured, linkError, invalidReset }: { mode: AuthMode; next: string; configured: boolean; linkError?: boolean; invalidReset?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = Object.fromEntries(data.entries());
    if ((mode === 'signup' || mode === 'reset') && input.password !== input.confirmPassword) {
      setError('Las contraseñas deben coincidir.');
      return;
    }
    setError(''); setMessage(''); setBusy(true);
    try {
      const response = await fetch(`/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, next }), credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos completar la solicitud.');
      if (typeof result.redirect === 'string' && result.redirect.startsWith('/') && !result.redirect.startsWith('//')) {
        window.location.assign(result.redirect);
        return;
      }
      setMessage(result.message || 'La solicitud está lista.');
      form.reset();
    } catch (error) { setError(error instanceof Error ? error.message : 'Revisa tu conexión e intenta de nuevo.'); }
    finally { setBusy(false); }
  }

  const unavailable = !configured || Boolean(invalidReset);
  return <>
    {!configured && <div className="auth-notice" role="status">Estamos preparando el acceso a Cotiza. El propietario debe completar la conexión del servicio de cuentas.</div>}
    {linkError && <div className="auth-notice" role="alert">El enlace no es válido o ya venció. Abre el último correo en el navegador donde hiciste la solicitud, o pide otro enlace.</div>}
    {invalidReset && <div className="auth-notice" role="alert">Primero abre el enlace de recuperación de tu correo. <a href="/acceso/recuperar">Solicitar otro enlace</a></div>}
    {message ? <div className="auth-success" role="status"><span><Check size={22}/></span><h2>Revisa tu correo.</h2><p>{message}</p><a href="/acceso" className="button button-secondary">Volver al acceso <ArrowUpRight size={17}/></a></div> : <form className="auth-form" onSubmit={submit}>
      {mode === 'signup' && <label>Tu nombre<input name="name" autoComplete="name" minLength={2} maxLength={80} required placeholder="Como te conocen tus clientes" disabled={busy || unavailable}/></label>}
      {mode !== 'reset' && <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="tu@correo.com" disabled={busy || unavailable}/></label>}
      {mode !== 'recover' && <label><span>Contraseña{mode === 'signin' && <a href="/acceso/recuperar">La olvidé</a>}</span><input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? 1 : 12} maxLength={256} required placeholder={mode === 'signin' ? 'Tu contraseña' : 'Al menos 12 caracteres'} disabled={busy || unavailable}/></label>}
      {(mode === 'signup' || mode === 'reset') && <label>Repite la contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={256} required placeholder="Una vez más, para confirmar" disabled={busy || unavailable}/></label>}
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="button button-primary auth-submit" disabled={busy || unavailable}>{busy ? <><Loader2 size={17} className="auth-spinner"/> Un momento…</> : <>{labels[mode]}<ArrowUpRight size={18}/></>}</button>
      {(mode === 'signup' || mode === 'signin') && <p className="auth-fine"><LockKeyhole size={12}/>{mode === 'signup' ? 'Confirma tu correo para empezar. Sin tarjeta.' : 'Tu negocio y tus presupuestos, en tu cuenta.'}</p>}
    </form>}
  </>;
}
