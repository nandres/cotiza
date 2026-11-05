import type { Database } from './database-types';
import type { BusinessProfile, Client, Service, Quote, WorkspaceData } from './types';
import { normalizeProfile, normalizeClient, normalizeService, normalizeQuote, calculateAmounts, defaultProfile, currentMonth, today, ValidationError } from './domain';

export type Actor = { userId: string; displayName: string; email: string };
type Row = Record<string, string | number | null>;
const FREE_LIMIT = 3;
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
function fail(status: number, message: string): never { throw new HttpError(status, message); }
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const newToken = () => (uuid() + uuid()).replaceAll('-', '');
const nextTimestamp = (last: string) => new Date(Math.max(Date.now(), Date.parse(last) + 1)).toISOString();
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' } });
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'Envía los datos en formato JSON.');
  const value = await request.text();
  if (new TextEncoder().encode(value).length > 500_000) fail(413, 'El archivo o los datos superan el tamaño permitido.');
  let result: unknown;
  try { result = JSON.parse(value); } catch { fail(400, 'Los datos no tienen un formato válido.'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) fail(400, 'Los datos no tienen un formato válido.');
  return result as Record<string, unknown>;
}
function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) fail(403, 'La solicitud debe realizarse desde Cotiza.');
}
function objectFromRow<T>(row: Row): T {
  const { owner_id, created_at, ...data } = row;
  return { ...data, createdAt: created_at } as T;
}
function quoteFromRow(row: Row): Quote {
  return { ...JSON.parse(String(row.data)), id: String(row.id), number: String(row.number), status: row.status,
    currency: row.currency, token: row.token, createdAt: row.created_at, updatedAt: row.updated_at, responseNote: row.response_note };
}
async function profileFor(db: Database, actor: Actor): Promise<BusinessProfile> {
  const initial = defaultProfile(actor.email, actor.displayName);
  await db.prepare('INSERT INTO business_profiles (owner_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT (owner_id) DO NOTHING')
    .bind(actor.userId, JSON.stringify(initial), now()).run();
  const row = await db.prepare('SELECT data FROM business_profiles WHERE owner_id = ?').bind(actor.userId).first<Row>();
  return JSON.parse(String(row!.data));
}
async function ownedQuote(db: Database, owner: string, id: string): Promise<Row> {
  const row = await db.prepare('SELECT * FROM quotes WHERE id = ? AND owner_id = ? AND deleted = 0').bind(id, owner).first<Row>();
  if (!row) fail(404, 'No encontramos ese presupuesto.');
  return row!;
}
async function clientFor(db: Database, owner: string, id: string): Promise<Client> {
  const row = await db.prepare('SELECT * FROM clients WHERE id = ? AND owner_id = ?').bind(id, owner).first<Row>();
  if (!row) fail(400, 'Selecciona un cliente de tu cuenta.');
  return objectFromRow<Client>(row!);
}
async function makeQuoteData(db: Database, actor: Actor, input: Record<string, unknown>, profile: BusinessProfile) {
  const clean = normalizeQuote(input, profile.currency);
  const client = await clientFor(db, actor.userId, clean.clientId);
  return { ...clean, ...calculateAmounts(clean.items, clean.discountPercent, profile.currency), client, business: profile };
}
async function listWorkspace(db: Database, actor: Actor): Promise<WorkspaceData> {
  const profile = await profileFor(db, actor);
  const result = await db.batch([
    db.prepare('SELECT * FROM clients WHERE owner_id = ? ORDER BY lower(name), name').bind(actor.userId),
    db.prepare('SELECT * FROM services WHERE owner_id = ? ORDER BY lower(name), name').bind(actor.userId),
    db.prepare('SELECT * FROM quotes WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC').bind(actor.userId),
    db.prepare('SELECT COUNT(*) AS count FROM quotes WHERE owner_id = ? AND created_month = ?').bind(actor.userId, currentMonth()),
  ]);
  return { user: { name: actor.displayName, email: actor.email }, profile,
    clients: (result[0].results as Row[]).map(r => objectFromRow<Client>(r)),
    services: (result[1].results as Row[]).map(r => objectFromRow<Service>(r)),
    quotes: (result[2].results as Row[]).map(quoteFromRow),
    usage: { used: Number((result[3].results[0] as Row).count), limit: FREE_LIMIT, month: currentMonth(), plan: 'free' },
    billing: { enabled: false, monthlyPrice: 4.99, annualPrice: 49.90 },
  };
}

async function publicRoute(request: Request, token: string, db: Database) {
  if (!/^[a-f0-9]{64}$/.test(token)) fail(404, 'Este presupuesto no está disponible.');
  const row = await db.prepare('SELECT * FROM quotes WHERE token = ? AND deleted = 0 AND status != ?').bind(token, 'draft').first<Row>();
  if (!row) fail(404, 'Este presupuesto no está disponible o su enlace fue renovado.');
  const quote = quoteFromRow(row!);
  const expired = quote.validUntil < today();
  if (request.method === 'GET') {
    // Public links expose the quote, never the client's contact book or account identity.
    quote.client = { ...quote.client, email: '', phone: '', address: '' };
    return json({ quote, expired });
  }
  if (request.method !== 'POST') fail(405, 'Método no disponible.');
  const input = await body(request);
  if (expired) fail(409, 'Este presupuesto venció. Solicita uno actualizado al técnico.');
  if (quote.status !== 'sent') fail(409, 'Este presupuesto ya recibió una respuesta.');
  if (input.version !== quote.updatedAt) fail(409, 'El presupuesto cambió. Recarga la página antes de responder.');
  const actions: Record<string, string> = { accept: 'accepted', changes: 'changes_requested', reject: 'rejected' };
  const status = typeof input.action === 'string' && Object.hasOwn(actions, input.action) ? actions[input.action] : undefined;
  if (!status) fail(400, 'Selecciona una respuesta válida.');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > 2000) fail(400, 'La respuesta admite hasta 2.000 caracteres.');
  if (input.action === 'changes' && note.length < 3) fail(400, 'Indica los cambios que necesitas.');
  const result = await db.prepare('UPDATE quotes SET status = ?, response_note = ?, updated_at = ? WHERE id = ? AND token = ? AND status = ? AND updated_at = ? AND deleted = 0')
    .bind(status, note, nextTimestamp(quote.updatedAt), quote.id, token, 'sent', quote.updatedAt).run();
  if (!result.meta.changes) fail(409, 'El presupuesto cambió. Recarga la página.');
  return json({ ok: true, status });
}

export async function handleApi(request: Request, path: string[], actor: Actor | null, db: Database): Promise<Response> {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') checkOrigin(request);
    const [resource, id, action] = path;
    if (resource === 'public' && id && path.length === 2) return await publicRoute(request, id, db);
    if (!actor) fail(401, 'Inicia sesión para continuar.');
    const user = actor!;
    if (resource === 'workspace' && request.method === 'GET' && path.length === 1) return json(await listWorkspace(db, user));
    if (resource === 'profile' && request.method === 'PUT' && path.length === 1) {
      const clean = normalizeProfile(await body(request));
      await profileFor(db, user);
      const changed = await db.prepare("UPDATE business_profiles SET data = ?, updated_at = ? WHERE owner_id = ? AND ((data::jsonb ->> 'currency') = ? OR ((SELECT COUNT(*) FROM services WHERE owner_id = ?) + (SELECT COUNT(*) FROM quotes WHERE owner_id = ?)) = 0)")
        .bind(JSON.stringify(clean), now(), user.userId, clean.currency, user.userId, user.userId).run();
      if (!changed.meta.changes) fail(409, 'La moneda se elige antes de crear servicios o presupuestos. Así conservamos los importes originales.');
      return json(clean);
    }
    if ((resource === 'clients' || resource === 'services') && path.length <= 2) {
      const table = resource;
      if (request.method === 'POST' && !id) {
        const input = await body(request);
        const profile = await profileFor(db, user);
        const data = table === 'clients' ? normalizeClient(input) : normalizeService(input, profile.currency);
        const recordId = uuid(); const createdAt = now();
        const columns = table === 'clients' ? ['name', 'email', 'phone', 'address'] : ['name', 'description', 'unit', 'price'];
        const values = columns.map(k => (data as unknown as Record<string, string | number>)[k]);
        const currencyGuard = table === 'services' ? " AND (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ?" : '';
        const extra = table === 'services' ? [user.userId, profile.currency] : [];
        const result = await db.prepare(`INSERT INTO ${table} (id, owner_id, ${columns.join(', ')}, created_at) SELECT ?, ?, ${columns.map(() => '?').join(', ')}, ? WHERE (SELECT COUNT(*) FROM ${table} WHERE owner_id = ?) < 500${currencyGuard}`)
          .bind(recordId, user.userId, ...values, createdAt, user.userId, ...extra).run();
        if (!result.meta.changes) {
          if ((await profileFor(db, user)).currency !== profile.currency) fail(409, 'La moneda del negocio cambió. Recarga la página antes de crear el servicio.');
          fail(409, 'Alcanzaste el límite de 500 registros.');
        }
        return json({ id: recordId, ...data, createdAt }, 201);
      }
      if (id && (request.method === 'PATCH' || request.method === 'DELETE')) {
        const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ? AND owner_id = ?`).bind(id, user.userId).first<Row>();
        if (!row) fail(404, 'No encontramos ese registro.');
        if (request.method === 'DELETE') {
          if (table === 'clients') {
            const linked = await db.prepare("SELECT id FROM quotes WHERE owner_id = ? AND deleted = 0 AND (data::jsonb ->> 'clientId') = ? LIMIT 1").bind(user.userId, id).first();
            if (linked) fail(409, 'Este cliente tiene presupuestos. Archívalos antes de eliminarlo.');
          }
          await db.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`).bind(id, user.userId).run();
          return json({ ok: true });
        }
        const input = await body(request);
        const profile = await profileFor(db, user);
        const data = table === 'clients' ? normalizeClient(input) : normalizeService(input, profile.currency);
        const columns = Object.keys(data);
        await db.prepare(`UPDATE ${table} SET ${columns.map(k => `${k} = ?`).join(', ')} WHERE id = ? AND owner_id = ?`)
          .bind(...Object.values(data), id, user.userId).run();
        return json({ id, ...data, createdAt: row!.created_at });
      }
    }
    if (resource === 'quotes') {
      if (request.method === 'POST' && !id && path.length === 1) {
        const profile = await profileFor(db, user);
        const data = await makeQuoteData(db, user, await body(request), profile);
        const quoteId = uuid(); const timestamp = now(); const month = currentMonth();
        const number = `COT-${month.slice(0, 4)}-${quoteId.slice(0, 6).toUpperCase()}`;
        // Atomic insert: concurrent requests cannot exceed the monthly quota. Archived records still count.
        const result = await db.prepare("INSERT INTO quotes (id, owner_id, number, status, currency, data, token, created_at, updated_at, deleted, response_note, created_month) SELECT ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ? WHERE (SELECT COUNT(*) FROM quotes WHERE owner_id = ? AND created_month = ?) < ? AND (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ?")
          .bind(quoteId, user.userId, number, 'draft', profile.currency, JSON.stringify(data), timestamp, timestamp, '', month, user.userId, month, FREE_LIMIT, user.userId, profile.currency).run();
        if (!result.meta.changes) {
          if ((await profileFor(db, user)).currency !== profile.currency) fail(409, 'La moneda del negocio cambió. Recarga la página antes de crear el presupuesto.');
          fail(409, 'Llegaste a tus 3 presupuestos de este mes. Puedes editar los existentes; el límite se renueva el mes siguiente.');
        }
        return json(quoteFromRow(await ownedQuote(db, user.userId, quoteId)), 201);
      }
      if (id && path.length <= 3) {
        const row = await ownedQuote(db, user.userId, id);
        const quote = quoteFromRow(row);
        if (request.method === 'GET' && path.length === 2) return json(quote);
        if (request.method === 'POST' && action === 'send') {
          if (quote.status === 'sent') return json(quote);
          if (quote.status !== 'draft') fail(409, 'Vuelve el presupuesto a borrador antes de enviarlo.');
          if (quote.validUntil < today()) fail(400, 'Actualiza la fecha de vigencia antes de compartir.');
          const result = await db.prepare('UPDATE quotes SET status = ?, token = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status = ? AND deleted = 0')
            .bind('sent', newToken(), nextTimestamp(quote.updatedAt), id, user.userId, 'draft').run();
          if (!result.meta.changes) fail(409, 'El presupuesto cambió. Recarga la página.');
          return json(quoteFromRow(await ownedQuote(db, user.userId, id)));
        }
        if (request.method === 'DELETE' && path.length === 2) {
          await db.prepare('UPDATE quotes SET deleted = 1, token = NULL, updated_at = ? WHERE id = ? AND owner_id = ?').bind(nextTimestamp(quote.updatedAt), id, user.userId).run();
          return json({ ok: true });
        }
        if (request.method === 'PATCH' && path.length === 2) {
          const input = await body(request);
          if (quote.status === 'accepted') fail(409, 'Un presupuesto aceptado se conserva sin cambios. Crea otro para una propuesta nueva.');
          if (input.action === 'reopen') {
            const result = await db.prepare('UPDATE quotes SET status = ?, token = NULL, response_note = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status != ? AND deleted = 0')
              .bind('draft', '', nextTimestamp(quote.updatedAt), id, user.userId, 'accepted').run();
            if (!result.meta.changes) fail(409, 'El presupuesto cambió. Recarga la página.');
          } else {
            if (quote.status !== 'draft' && quote.status !== 'changes_requested') fail(409, 'Vuelve el presupuesto a borrador para editarlo.');
            const profile = await profileFor(db, user);
            const data = await makeQuoteData(db, user, input, { ...profile, currency: quote.currency });
            const result = await db.prepare('UPDATE quotes SET data = ?, status = ?, token = NULL, response_note = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND status IN (?, ?) AND deleted = 0')
              .bind(JSON.stringify(data), 'draft', '', nextTimestamp(quote.updatedAt), id, user.userId, 'draft', 'changes_requested').run();
            if (!result.meta.changes) fail(409, 'El presupuesto cambió. Recarga la página.');
          }
          return json(quoteFromRow(await ownedQuote(db, user.userId, id)));
        }
      }
    }
    if (resource === 'demo' && request.method === 'POST' && path.length === 1) {
      const profile = await profileFor(db, user);
      const counts = await db.prepare('SELECT (SELECT COUNT(*) FROM clients WHERE owner_id = ?) + (SELECT COUNT(*) FROM services WHERE owner_id = ?) + (SELECT COUNT(*) FROM quotes WHERE owner_id = ?) AS count')
        .bind(user.userId, user.userId, user.userId).first<Row>();
      if (Number(counts!.count) > 0) fail(409, 'El ejemplo se carga en una cuenta vacía para cuidar tus datos.');
      const timestamp = now();
      const prefix = (await crypto.subtle.digest('SHA-256', new TextEncoder().encode(user.userId)));
      const suffix = Array.from(new Uint8Array(prefix)).map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 24);
      const clientId = `example-client-${suffix}`;
      const client: Client = { id: clientId, name: 'María — cliente de ejemplo', email: '', phone: '', address: 'Dirección de ejemplo', createdAt: timestamp };
      const base = profile.currency === 'PYG' ? 350000 : 50;
      const items = [{ description: 'Instalación de aire acondicionado — ejemplo', quantity: 1, unitPrice: base }, { description: 'Materiales — ejemplo', quantity: 1, unitPrice: profile.currency === 'PYG' ? 150000 : 20 }];
      const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const data = { title: 'Instalación de aire acondicionado — ejemplo', clientId, items, discountPercent: 0, validUntil, notes: 'Presupuesto de ejemplo. Edita los servicios y precios según tu trabajo.', terms: profile.defaultTerms, client, business: profile, ...calculateAmounts(items, 0, profile.currency) };
      const month = currentMonth();
      // The batch observes and guards one currency atomically; a stale profile must not seed amounts in another currency.
      const demoResults = await db.batch([
        db.prepare("SELECT (data::jsonb ->> 'currency') AS currency FROM business_profiles WHERE owner_id = ?").bind(user.userId),
        db.prepare("INSERT INTO clients (id, owner_id, name, email, phone, address, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ? ON CONFLICT DO NOTHING").bind(clientId, user.userId, client.name, '', '', client.address, timestamp, user.userId, profile.currency),
        db.prepare("INSERT INTO clients (id, owner_id, name, email, phone, address, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ? ON CONFLICT DO NOTHING").bind(`example-client2-${suffix}`, user.userId, 'Carlos — cliente de ejemplo', '', '', '', timestamp, user.userId, profile.currency),
        ...[['Instalación de aire acondicionado', base], ['Mantenimiento preventivo', profile.currency === 'PYG' ? 180000 : 30], ['Materiales', profile.currency === 'PYG' ? 150000 : 20]].map(([name, price], i) => db.prepare("INSERT INTO services (id, owner_id, name, description, unit, price, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ? ON CONFLICT DO NOTHING").bind(`example-service${i}-${suffix}`, user.userId, name, 'Servicio de ejemplo: ajusta el precio a tu negocio.', 'servicio', price, timestamp, user.userId, profile.currency)),
        db.prepare("INSERT INTO quotes (id, owner_id, number, status, currency, data, token, created_at, updated_at, deleted, response_note, created_month) SELECT ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ? WHERE (SELECT COUNT(*) FROM quotes WHERE owner_id = ? AND created_month = ?) < ? AND (SELECT (data::jsonb ->> 'currency') FROM business_profiles WHERE owner_id = ?) = ? ON CONFLICT DO NOTHING").bind(`example-quote-${suffix}`, user.userId, 'COT-EJEMPLO', 'draft', profile.currency, JSON.stringify(data), timestamp, timestamp, '', month, user.userId, month, FREE_LIMIT, user.userId, profile.currency),
      ]);
      if ((demoResults[0].results[0] as Row)?.currency !== profile.currency) fail(409, 'La moneda cambió. Recarga la página antes de cargar el ejemplo.');
      return json(await listWorkspace(db, user), 201);
    }
    fail(404, 'Esta función no está disponible.');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    // Validation errors are intentionally readable; infrastructure errors stay server-side.
    if (error instanceof ValidationError) {
      return json({ error: error.message }, 400);
    }
    console.error('Cotiza API:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'No pudimos guardar los datos. Intenta nuevamente en un momento.' }, 500);
  }
}
