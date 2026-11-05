import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import Brand, { BrandSymbol } from '@/components/Brand';
import { getUser } from '@/lib/auth';
import { authConfigured } from '@/lib/supabase/config';
import { safeReturnPath } from '@/lib/supabase/paths';
import AuthForm, { type AuthMode } from './AuthForm';
import './auth.css';

const copy = {
  signin: { label: '01 / TU ESPACIO', title: <>Todo listo.<br/><span>Sigamos.</span></>, detail: 'Entra para preparar tu próxima propuesta y seguir cada respuesta.' },
  signup: { label: '01 / EL COMIENZO', title: <>Un oficio.<br/><span>Tu espacio.</span></>, detail: 'Crea tu cuenta y dale forma a tu primer presupuesto.' },
  recover: { label: 'VOLVER AL HILO', title: <>Tu acceso,<br/><span>de vuelta.</span></>, detail: 'Te enviamos un enlace para crear una contraseña nueva.' },
  reset: { label: 'UN NUEVO ACCESO', title: <>Volvamos<br/><span>a lo tuyo.</span></>, detail: 'Elige una contraseña nueva para seguir con tu trabajo.' },
};

export default async function AuthPage({ mode = 'signin', next: suppliedNext, linkError }: { mode?: AuthMode; next?: string; linkError?: boolean }) {
  const configured = authConfigured();
  const next = safeReturnPath(suppliedNext);
  const user = configured ? await getUser() : null;
  if (user && (mode === 'signin' || mode === 'signup')) redirect(next);
  const current = copy[mode];
  return <main className="auth-page">
    <header className="auth-header"><Brand/><a href="/" className="auth-home"><ArrowLeft size={15}/> Volver a Cotiza</a></header>
    <div className="auth-layout">
      <aside className="auth-story" aria-label="Cotiza, tu oficio en claro">
        <span className="auth-kicker"><i/> EL ESTUDIO DE TU PRÓXIMO TRABAJO</span>
        <h2>Lo que haces<br/>lleva tu<br/><span>firma.</span></h2>
        <div className="auth-registration" aria-hidden="true"><BrandSymbol/><span>TU OFICIO. EN CLARO.</span></div>
        <p>Tus precios, tu marca y cada acuerdo<br/>en un solo lugar.</p>
      </aside>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-top"><span>{current.label}</span><span aria-hidden="true">C /</span></div>
        {(mode === 'signin' || mode === 'signup') && <nav className="auth-tabs" aria-label="Acceso a tu cuenta"><a href={`/acceso?next=${encodeURIComponent(next)}`} aria-current={mode === 'signin' ? 'page' : undefined}>Ya tengo cuenta</a><a href={`/acceso/registro?next=${encodeURIComponent(next)}`} aria-current={mode === 'signup' ? 'page' : undefined}>Crear una cuenta</a></nav>}
        <h1 id="auth-title">{current.title}</h1><p className="auth-description">{current.detail}</p>
        <AuthForm mode={mode} next={next} configured={configured} linkError={linkError} invalidReset={mode === 'reset' && configured && !user}/>
        {(mode === 'recover' || mode === 'reset') && <a className="auth-back" href="/acceso"><ArrowLeft size={14}/> Volver a iniciar sesión</a>}
      </section>
    </div>
    <footer className="auth-footer"><span>Hecho para quienes hacen.</span><span>© {new Date().getFullYear()} Cotiza</span></footer>
  </main>;
}
