/** Cotiza's registration mark and lettering, drawn on the same eight-unit grid. */
export function BrandSymbol({ className = '' }: { className?: string }) {
  return <svg className={`brand-symbol ${className}`} viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path className="brand-symbol-body" d="M35 5H20C9 5 3 12 3 22s6 17 17 17h7l8-8H20c-6 0-9-3-9-9s3-9 9-9h7l8-8Z" fill="currentColor"/>
    <path className="brand-symbol-cut" d="M35 18h7l-7 8h-7l7-8Z" fill="currentColor"/>
  </svg>;
}

export function ProcessGlyph({ step }: { step: 1 | 2 | 3 }) {
  return <svg className="process-glyph" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {step === 1 && <><path d="M18 3H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5Z M18 3v5h5M10 13h8M10 18h5"/><path className="glyph-accent" d="m9 6 2 2-2 2"/></>}
    {step === 2 && <><path d="M4 21v-7a3 3 0 0 1 3-3h15M16 5l6 6-6 6"/><path className="glyph-accent" d="M4 25h4M25 8v6"/></>}
    {step === 3 && <><path d="M23 17v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10M10 14l4 4L24 6"/><path className="glyph-accent" d="M10 22h5"/></>}
  </svg>;
}

export default function Brand({ className = '' }: { className?: string }) {
  return <a href="/" className={`brand ${className}`} aria-label="Cotiza, inicio">
    <BrandSymbol/>
    <svg className="brand-lettering" viewBox="0 0 142 34" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12c-5-5-16-3-16 7s11 13 17 7"/>
        <ellipse cx="36.5" cy="19" rx="9.5" ry="10"/>
        <path d="M58 3v19c0 6 3 7 8 6M52 10h16M78 11v17M90 10h17L90 28h18"/>
        <path d="M133 10v18m0-9c0-6-4-10-9-10s-9 4-9 10 4 10 9 10 9-4 9-10Z"/>
      </g>
      <path className="brand-lettering-dot" d="m78 0 3.4 3.4L78 6.8l-3.4-3.4L78 0Z" fill="currentColor"/>
    </svg>
  </a>;
}
