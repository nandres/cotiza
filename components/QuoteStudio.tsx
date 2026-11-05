'use client';

import { useState } from 'react';
import { Check, CheckCheck, Link2, PencilLine, Wind } from 'lucide-react';
import './quote-studio.css';

const stages = [
  { label: 'Preparar', title: 'Tu trabajo, bien detallado.', detail: 'Elige los conceptos. Los precios los defines tú.', status: 'Todo empieza con claridad.', icon: PencilLine },
  { label: 'Compartir', title: 'Una propuesta que se puede abrir.', detail: 'Tu cliente recibe un enlace con todo el detalle.', status: 'Un enlace. Toda la propuesta.', icon: Link2 },
  { label: 'Aceptar', title: 'Y una respuesta para avanzar.', detail: 'La respuesta queda registrada en tu espacio.', status: 'Aceptado. El siguiente paso es tuyo.', icon: CheckCheck },
] as const;

export default function QuoteStudio() {
  const [step, setStep] = useState(0);
  const current = stages[step];
  const StatusIcon = current.icon;

  return (
    <section className="qs-studio" data-step={step} aria-label="Ejemplo interactivo de un presupuesto">
      <div className="qs-edge-light" aria-hidden="true" />
      <header className="qs-studio-bar">
        <span className="qs-example-label"><span aria-hidden="true" /> Ejemplo interactivo</span>
        <span className="qs-sheet-index">0{step + 1}<span> / 03</span></span>
      </header>

      <div className="qs-stage">
        <div className="qs-glass-sheet qs-sheet-back" aria-hidden="true"><span /></div>
        <div className="qs-glass-sheet qs-sheet-middle" aria-hidden="true" />
        <article className="qs-paper" aria-label="Presupuesto de ejemplo de Clima Sur">
          <header className="qs-paper-header">
            <div className="qs-business">
              <span className="qs-business-mark" aria-hidden="true"><Wind size={20} strokeWidth={1.5} /></span>
              <span><strong>Clima Sur</strong><small>Instalación y mantenimiento</small></span>
            </div>
            <span className="qs-paper-example">Ejemplo</span>
          </header>
          <div className="qs-paper-heading">
            <div className="qs-reference"><span>Presupuesto</span><span>COT—001</span></div>
            <h3>Un ambiente más fresco.</h3>
            <p>Preparado para María González</p>
          </div>
          <dl className="qs-concepts">
            <div><dt>Instalación</dt><dd>Gs. 350.000</dd></div>
            <div><dt>Kit de materiales</dt><dd>Gs. 150.000</dd></div>
          </dl>
          <div className="qs-total"><span>Total del presupuesto</span><strong>Gs. 500.000</strong></div>
          <div className="qs-approval-seal" aria-hidden="true"><Check size={21} strokeWidth={1.5} /></div>
        </article>

        <div className="qs-state-tab" key={`state-${step}`} aria-hidden="true">
          <StatusIcon size={17} strokeWidth={1.6} />
          <span>{current.status}</span>
        </div>
      </div>

      <div className="qs-controls" role="group" aria-label="Explora las etapas del ejemplo">
        {stages.map((stage, index) => (
          <button key={stage.label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
            <span className="qs-control-number">0{index + 1}</span>{stage.label}
          </button>
        ))}
        <span className="qs-controls-underline" aria-hidden="true" style={{ transform: `translateX(${step * 100}%)` }} />
      </div>
      <div className="qs-caption" key={`caption-${step}`} aria-live="polite" aria-atomic="true">
        <strong>{current.title}</strong><span className="qs-sr-only"> {current.detail}</span>
      </div>
    </section>
  );
}
