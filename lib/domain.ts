import type { BusinessProfile, Client, Currency, QuoteInput, QuoteItem, Service } from './types';

type UnknownRecord = Record<string, unknown>;
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
function record(input: unknown, label: string): UnknownRecord {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError(`${label}: los datos no son válidos.`);
  return input as UnknownRecord;
}
function text(input: unknown, label: string, max: number, required = false): string {
  if (input === undefined && !required) return '';
  if (typeof input !== 'string') throw new ValidationError(`${label}: debe ser texto.`);
  const value = input.trim();
  if (required && !value) throw new ValidationError(`${label}: es obligatorio.`);
  if (value.length > max) throw new ValidationError(`${label}: máximo ${max} caracteres.`);
  if (value.includes('\u0000')) throw new ValidationError(`${label}: contiene caracteres no válidos.`);
  return value;
}
function currencyValue(input: unknown): Currency {
  if (input !== 'PYG' && input !== 'USD') throw new ValidationError('Selecciona una moneda válida: PYG o USD.');
  return input;
}
function numeric(input: unknown, label: string, min: number, max: number, decimals: number): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) throw new ValidationError(`${label}: debe ser un número válido.`);
  if (input < min || input > max) throw new ValidationError(`${label}: debe estar entre ${min} y ${max}.`);
  const factor = 10 ** decimals;
  const scaled = input * factor;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  if (Math.abs(scaled - Math.round(scaled)) > tolerance) throw new ValidationError(`${label}: admite hasta ${decimals} decimales.`);
  return Math.round(scaled) / factor;
}
function priceValue(input: unknown, currency: Currency): number {
  return numeric(input, 'Precio', 0, 1_000_000_000, currency === 'PYG' ? 0 : 2);
}
function emailValue(input: unknown): string {
  const value = text(input, 'Correo electrónico', 254);
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new ValidationError('El correo electrónico no es válido.');
  return value;
}
function isoDate(input: unknown): string {
  const value = text(input, 'Fecha de vigencia', 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError('La fecha de vigencia debe tener formato AAAA-MM-DD.');
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || Number(value.slice(0, 4)) < 2000) throw new ValidationError('La fecha de vigencia no existe o no es válida.');
  return value;
}
function logoValue(input: unknown): string {
  const value = text(input, 'Logo', 300_000);
  if (!value) return '';
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new ValidationError('El logo debe ser una imagen PNG, JPEG o WebP válida.');
  let decoded: string;
  try { decoded = atob(match[2]); } catch { throw new ValidationError('El logo contiene datos no válidos.'); }
  const valid = match[1] === 'png' ? decoded.startsWith('\x89PNG\r\n\x1a\n')
    : match[1] === 'jpeg' ? decoded.startsWith('\xff\xd8\xff')
      : decoded.startsWith('RIFF') && decoded.slice(8, 12) === 'WEBP';
  if (!valid) throw new ValidationError('El contenido del logo no corresponde a su formato de imagen.');
  return value;
}
export function normalizeProfile(input: unknown): BusinessProfile {
  const source = record(input, 'Negocio');
  return {
    businessName: text(source.businessName, 'Nombre del negocio', 120, true),
    contactName: text(source.contactName, 'Nombre de contacto', 120),
    email: emailValue(source.email), phone: text(source.phone, 'Teléfono', 40),
    address: text(source.address, 'Dirección', 300), currency: currencyValue(source.currency),
    logoDataUrl: logoValue(source.logoDataUrl), defaultTerms: text(source.defaultTerms, 'Condiciones predeterminadas', 3_000),
  };
}
export function defaultProfile(email: string, name: string): BusinessProfile {
  return normalizeProfile({ businessName: 'Mi negocio', contactName: name.slice(0, 120), email,
    phone: '', address: '', currency: 'PYG', logoDataUrl: '',
    defaultTerms: 'El trabajo se coordina una vez aceptado el presupuesto. Los cambios de alcance se presupuestan por separado.' });
}
export function normalizeClient(input: unknown): Pick<Client, 'name' | 'email' | 'phone' | 'address'> {
  const source = record(input, 'Cliente');
  return { name: text(source.name, 'Nombre del cliente', 120, true), email: emailValue(source.email),
    phone: text(source.phone, 'Teléfono', 40), address: text(source.address, 'Dirección', 300) };
}
export function normalizeService(input: unknown, currency: Currency): Pick<Service, 'name' | 'description' | 'unit' | 'price'> {
  currencyValue(currency);
  const source = record(input, 'Servicio');
  return { name: text(source.name, 'Nombre del servicio', 120, true), description: text(source.description, 'Descripción', 1_000),
    unit: text(source.unit, 'Unidad', 40, true), price: priceValue(source.price, currency) };
}
function normalizeItem(input: unknown, currency: Currency): QuoteItem {
  const source = record(input, 'Concepto');
  const quantity = numeric(source.quantity, 'Cantidad', 0, 100_000, 3);
  if (quantity === 0) throw new ValidationError('La cantidad debe ser mayor que cero.');
  return { description: text(source.description, 'Descripción del concepto', 500, true), quantity, unitPrice: priceValue(source.unitPrice, currency) };
}
function itemsValue(input: unknown, currency: Currency): QuoteItem[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) throw new ValidationError('El presupuesto debe tener entre 1 y 50 conceptos.');
  return input.map(item => normalizeItem(item, currency));
}
export function calculateAmounts(items: QuoteItem[], discountPercent: number, currency: Currency): { subtotal: number; discount: number; total: number } {
  currencyValue(currency);
  const validatedItems = itemsValue(items, currency);
  const percentage = numeric(discountPercent, 'Descuento', 0, 100, 2);
  const scale = currency === 'PYG' ? 1 : 100;
  let subtotalMinor = BigInt(0);
  for (const item of validatedItems) {
    const unitMinor = BigInt(Math.round(item.unitPrice * scale));
    const quantityMilli = BigInt(Math.round(item.quantity * 1_000));
    subtotalMinor += (unitMinor * quantityMilli + BigInt(500)) / BigInt(1_000);
  }
  if (subtotalMinor > BigInt(1_000_000_000_000) * BigInt(scale)) throw new ValidationError('El importe del presupuesto supera el máximo permitido.');
  const basisPoints = BigInt(Math.round(percentage * 100));
  const discountMinor = (subtotalMinor * basisPoints + BigInt(5_000)) / BigInt(10_000);
  return { subtotal: Number(subtotalMinor) / scale, discount: Number(discountMinor) / scale,
    total: Number(subtotalMinor - discountMinor) / scale };
}
export function normalizeQuote(input: unknown, currency: Currency): QuoteInput {
  currencyValue(currency);
  const source = record(input, 'Presupuesto');
  const quote = { title: text(source.title, 'Título', 120, true), clientId: text(source.clientId, 'Cliente', 100, true),
    items: itemsValue(source.items, currency), discountPercent: numeric(source.discountPercent, 'Descuento', 0, 100, 2),
    validUntil: isoDate(source.validUntil), notes: text(source.notes, 'Notas', 2_000), terms: text(source.terms, 'Condiciones', 3_000) };
  calculateAmounts(quote.items, quote.discountPercent, currency);
  return quote;
}
export function today(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function currentMonth(): string { return today().slice(0, 7); }
