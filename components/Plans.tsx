'use client';
import { useState } from 'react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';

export default function Plans() {
  const [annual, setAnnual] = useState(false);
  return <div className="plans">
    <div className="billing-switch" role="group" aria-label="Periodo del plan Profesional">
      <button aria-pressed={!annual} onClick={() => setAnnual(false)}>Mensual</button>
      <button aria-pressed={annual} onClick={() => setAnnual(true)}>Anual <span>2 meses de ahorro</span></button>
    </div>
    <div className="pricing-cards">
      <article className="price-card"><div className="price-card-top"><span className="plan-dot"/><h3>Esencial</h3><span>PARA EMPEZAR</span></div><div className="price-amount"><span>Gratis</span></div><p>Una buena propuesta no necesita<br/>un gran presupuesto.</p><ul><li><Check size={15}/> 3 presupuestos nuevos al mes</li><li><Check size={15}/> Clientes y servicios guardados</li><li><Check size={15}/> Respuestas por enlace y PDF</li></ul><a className="button button-secondary" href="/app">Empezar gratis <ArrowUpRight size={17}/></a><small>Sin tarjeta. Sin compromiso de pago.</small></article>
      <article className="price-card price-card-featured"><div className="price-card-top"><span className="plan-dot"/><h3>Profesional</h3><span>PRÓXIMAMENTE</span></div><div className="price-amount" aria-live="polite"><sup>US$</sup><span key={annual ? 'annual' : 'monthly'} className="price-value">{annual ? '49,90' : '4,99'}</span><small>/{annual ? 'año' : 'mes'}</small></div><p>{annual ? <>Un solo pago anual.<br/>Equivale a US$4,16 por mes.</> : <>Más espacio para un oficio<br/>que no se queda quieto.</>}</p><ul><li><Plus size={15}/> 50 presupuestos nuevos al mes</li><li><Check size={15}/> Tu logo, clientes e historial</li><li><Check size={15}/> Todo lo incluido en Esencial</li></ul><a className="button button-primary" href="/app">Probar gratis <ArrowUpRight size={17}/></a><small>Precio propuesto. Los cobros aún no están habilitados.</small></article>
    </div>
  </div>;
}
