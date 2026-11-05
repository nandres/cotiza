import { ArrowDown, ArrowUpRight, Check, Layers2 } from 'lucide-react';
import QuoteStudio from '@/components/QuoteStudio';
import Plans from '@/components/Plans';
import Brand, { BrandSymbol, ProcessGlyph } from '@/components/Brand';

export default function Home() {
  return <div className="landing">
    <div className="mineral-light" aria-hidden="true"><i/><i/><i/></div>
    <header className="site-header wrap">
      <Brand/>
      <nav aria-label="Navegación principal"><a href="#recorrido">El recorrido</a><a href="#planes">Planes</a></nav>
      <a className="header-entry" href="/app">Mi espacio <ArrowUpRight size={17}/></a>
    </header>
    <main>
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-tag"><span/> EL ESTUDIO DE TU PRÓXIMO TRABAJO</div>
          <h1 id="hero-title">Tu oficio.<br/><span className="hero-signature">En claro.<svg viewBox="0 0 410 23" fill="none" aria-hidden="true"><path d="M5 16C105 3 253 2 405 10M305 16l58 2"/></svg></span></h1>
          <p>Lo haces bien. Preséntalo igual.<br/>Presupuestos con tu marca, tus precios<br className="desktop-break"/> y cada detalle en su lugar.</p>
          <div className="hero-actions"><a className="button button-primary" href="/app">Crear mi primer presupuesto <ArrowUpRight size={18}/></a></div>
          <div className="hero-note"><Check size={14}/> Empieza gratis <span/> Sin tarjeta de crédito</div>
        </div>
        <div className="hero-object"><QuoteStudio/></div>
        <a className="hero-scroll" href="#recorrido"><span>DE LA IDEA AL ACUERDO</span><ArrowDown size={15}/></a>
        <div className="hero-edition" aria-hidden="true"><BrandSymbol/> <span>DISEÑADO PARA TU OFICIO</span></div>
      </section>
      <section className="workflow wrap" id="recorrido" aria-labelledby="workflow-title">
        <div className="section-label"><span>01 / EL RECORRIDO</span><span className="fine-line"/></div>
        <div className="workflow-intro"><h2 id="workflow-title">Menos vueltas.<br/><span>Más acuerdos.</span></h2><p>Un espacio para preparar tu propuesta<br/>y saber en qué quedó.</p></div>
        <div className="workflow-rail">
          <article><div className="rail-heading"><span className="rail-index">01</span><ProcessGlyph step={1}/></div><h3>Dale forma.</h3><p>Elige a tu cliente. Agrega servicios, materiales y condiciones. Las cuentas quedan listas.</p><span className="rail-detail">TU PRECIO. TU CRITERIO.</span></article>
          <article><div className="rail-heading"><span className="rail-index">02</span><ProcessGlyph step={2}/></div><h3>Hazlo llegar.</h3><p>Comparte un enlace por WhatsApp o guarda el presupuesto como PDF desde el navegador.</p><span className="rail-detail">TU MARCA, BIEN PRESENTADA.</span></article>
          <article><div className="rail-heading"><span className="rail-index">03</span><ProcessGlyph step={3}/></div><h3>Sigue el hilo.</h3><p>Tu cliente acepta o pide cambios. Su respuesta queda junto a la propuesta, en tu panel.</p><span className="rail-detail">CADA RESPUESTA, EN SU LUGAR.</span></article>
        </div>
        <div className="studio-note"><span className="studio-note-icon"><Layers2 size={19} strokeWidth={1.4}/></span><p>Clientes, servicios y precios guardados.<br/><strong>Tu siguiente presupuesto empieza un paso adelante.</strong></p><span className="studio-note-mark" aria-hidden="true"><BrandSymbol/></span></div>
      </section>
      <section className="pricing-section wrap" id="planes" aria-labelledby="pricing-title">
        <div className="section-label"><span>02 / A TU MEDIDA</span><span className="fine-line"/></div>
        <div className="pricing-intro"><h2 id="pricing-title">Pequeño precio.<br/><span>Buen comienzo.</span></h2><p>Empieza con lo que necesitas hoy.<br/>Más capacidad cuando tu trabajo la pida.</p></div>
        <Plans/>
      </section>
      <section className="closing wrap"><div><span className="eyebrow">EL PRÓXIMO PASO ES TUYO</span><h2>Que tu trabajo<br/>hable bien de ti.</h2></div><a className="closing-link" href="/app" aria-label="Abrir mi espacio en Cotiza"><ArrowUpRight size={37} strokeWidth={1.2}/><span>Abrir mi espacio</span></a></section>
    </main>
    <footer className="site-footer wrap"><Brand/><p>Tu oficio. En claro.</p><span>© {new Date().getFullYear()} Cotiza</span></footer>
  </div>;
}
