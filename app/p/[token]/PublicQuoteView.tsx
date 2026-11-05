'use client';
import { useEffect, useState } from 'react';
import { Check, CheckCircle2, ChevronLeft, CircleAlert, FileText, MessageSquare, Printer, ShieldCheck, X } from 'lucide-react';
import Brand from '@/components/Brand';
import QuoteDocument, { statusLabels } from '@/components/QuoteDocument';
import type { PublicQuote } from '@/lib/types';
import '../../cotiza.css';

export default function PublicQuoteView({ token }: { token: string }) {
  const [data, setData] = useState<PublicQuote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'changes' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  async function load() {
    const response = await fetch(`/api/public/${encodeURIComponent(token)}`, { cache: 'no-store' });
    const value = await response.json() as PublicQuote & { error?: string };
    if (!response.ok) throw new Error(value.error || 'No pudimos abrir este presupuesto.');
    setData(value);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, [token]);
  async function respond(action: 'accept' | 'changes' | 'reject') {
    if (!data || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/public/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note, version: data.quote.updatedAt }) });
      const value = await response.json() as { error?: string };
      if (!response.ok) throw new Error(value.error || 'No pudimos enviar tu respuesta.');
      await load(); setMode(null); setNote('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un problema.'); }
    finally { setBusy(false); }
  }
  return <main className="public-quote-page">
    <nav className="public-quote-nav no-print"><Brand/><span><ShieldCheck size={15}/> Presupuesto compartido</span></nav>
    {error && <div className="c-alert c-alert-error no-print" role="alert"><CircleAlert size={18}/>{error}</div>}
    {!data && !error && <div className="public-loading" role="status">Preparando tu presupuesto…</div>}
    {!data && error && <div className="public-unavailable"><FileText size={40}/><h1>Este presupuesto no está disponible</h1><p>Solicita al negocio un enlace actualizado.</p></div>}
    {data && <>
      <div className="public-intro no-print"><span className="eyebrow">{data.quote.business.businessName || 'Presupuesto'}</span><h1>Un paso más cerca de tu próximo proyecto.</h1><p>Revisa el detalle y envía tu respuesta al negocio.</p></div>
      {data.quote.status === 'accepted' && <div className="public-status accepted no-print"><CheckCircle2 size={22}/><div><strong>Presupuesto aceptado</strong><p>Tu respuesta quedó registrada. Coordina el trabajo y el pago directamente con el negocio.</p></div></div>}
      {data.quote.status === 'changes_requested' && <div className="public-status no-print"><MessageSquare size={22}/><div><strong>Solicitud de cambios enviada</strong><p>{data.quote.responseNote || 'El negocio podrá revisar tu solicitud y preparar una nueva versión.'}</p></div></div>}
      {data.quote.status === 'rejected' && <div className="public-status no-print"><X size={22}/><div><strong>Respuesta registrada</strong><p>Informaste al negocio que no continuarás con este presupuesto.</p></div></div>}
      {data.expired && data.quote.status === 'sent' && <div className="public-status no-print"><CircleAlert size={22}/><div><strong>La vigencia terminó</strong><p>Contacta al negocio para solicitar un presupuesto actualizado.</p></div></div>}
      <QuoteDocument quote={data.quote}/>
      <div className="public-actions no-print"><button className="button button-secondary" onClick={() => window.print()}><Printer size={16}/> Imprimir / guardar PDF</button><span className={`status-pill status-${data.quote.status}`}>{statusLabels[data.quote.status]}</span></div>
      {data.quote.status === 'sent' && !data.expired && <section className="public-response no-print"><div><h2>¿Cómo quieres continuar?</h2><p>La aceptación registra tu conformidad. El pago se coordina con el negocio.</p></div>{!mode ? <div className="public-response-buttons"><button className="button button-primary" disabled={busy} onClick={() => respond('accept')}><Check size={17}/>{busy ? 'Enviando…' : 'Aceptar presupuesto'}</button><button className="button button-secondary" onClick={() => setMode('changes')}><MessageSquare size={17}/> Pedir cambios</button><button className="button button-ghost" onClick={() => setMode('reject')}>No continuar</button></div> : <form onSubmit={e => { e.preventDefault(); respond(mode); }}><label className="c-field">{mode === 'changes' ? '¿Qué necesitas modificar?' : 'Comentario para el negocio (opcional)'}<textarea required={mode === 'changes'} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder={mode === 'changes' ? 'Cuéntale al negocio los cambios que necesitas.' : 'Puedes dejar una breve explicación.'}/></label><div className="c-form-actions"><button className="button button-ghost" type="button" onClick={() => setMode(null)}><ChevronLeft size={15}/> Volver</button><button className="button button-primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar respuesta'}</button></div></form>}</section>}
      <footer className="public-bottom no-print">Una forma más simple de empezar un trabajo. <a href="/">Conoce Cotiza ↗</a></footer>
    </>}
  </main>;
}
