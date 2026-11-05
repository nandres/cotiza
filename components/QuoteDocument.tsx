import type { Currency, Quote } from '@/lib/types';
import { calculateAmounts } from '@/lib/domain';

export function money(value: number, currency: Currency = 'PYG') {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2 }).format(value);
}

export function shortDate(value: string) {
  if (!value) return 'Sin vencimiento';
  return new Intl.DateTimeFormat('es-PY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: value.length === 10 ? 'UTC' : 'America/Asuncion' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}

export const statusLabels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', changes_requested: 'Cambios solicitados', rejected: 'Rechazado' };

export default function QuoteDocument({ quote }: { quote: Quote }) {
  return <article className="quote-document" aria-label={`Presupuesto ${quote.number}`}>
    <header className="document-header">
      <div className="document-business">{quote.business.logoDataUrl ? <img src={quote.business.logoDataUrl} alt="Logo del negocio" className="document-logo" /> : <span className="document-logo-fallback">{(quote.business.businessName || 'Tu negocio').slice(0, 1)}</span>}<div><strong>{quote.business.businessName || 'Mi negocio'}</strong><span>{quote.business.contactName}</span><span>{quote.business.phone}</span><span>{quote.business.email}</span></div></div>
      <div className="document-id"><span className="eyebrow">PRESUPUESTO</span><strong>{quote.number}</strong><span>{shortDate(quote.createdAt)}</span></div>
    </header>
    <div className="document-rule" />
    <div className="document-parties"><div><span className="document-label">PREPARADO PARA</span><h2>{quote.client.name}</h2>{quote.client.address && <p>{quote.client.address}</p>}</div><div className="document-validity"><span className="document-label">VÁLIDO HASTA</span><p>{shortDate(quote.validUntil)}</p></div></div>
    <h1 className="document-title">{quote.title}</h1>
    <div className="document-table-wrap"><table className="document-table"><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>{quote.items.map((item, i) => <tr key={i}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitPrice, quote.currency)}</td><td>{money(calculateAmounts([item], 0, quote.currency).total, quote.currency)}</td></tr>)}</tbody></table></div>
    <div className="document-totals"><div><span>Subtotal</span><span>{money(quote.subtotal, quote.currency)}</span></div>{quote.discountPercent > 0 && <div><span>Descuento ({quote.discountPercent}%)</span><span>−{money(quote.discount, quote.currency)}</span></div>}<div className="document-grand-total"><span>Total</span><strong>{money(quote.total, quote.currency)}</strong></div></div>
    {quote.notes && <section className="document-notes"><span className="document-label">OBSERVACIONES</span><p>{quote.notes}</p></section>}
    {quote.terms && <section className="document-notes"><span className="document-label">CONDICIONES DEL TRABAJO</span><p>{quote.terms}</p></section>}
    <footer className="document-footer"><span>{quote.business.address}</span><span>Preparado con <b>Cotiza</b></span></footer>
  </article>;
}
