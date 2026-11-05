import { getUser } from '@/lib/auth';
import { databaseConfigured, withDatabaseTransaction } from '@/lib/database';
import { handleApi } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Context = { params: Promise<{ path: string[] }> };
class RollbackResponse extends Error {
  response: Response;
  constructor(response: Response) { super('Roll back failed request'); this.response = response; }
}
function unavailable() {
  return Response.json({ error: 'Cotiza todavía está terminando su configuración. Intenta nuevamente en un momento.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
async function route(request: Request, context: Context) {
  const { path } = await context.params;
  const publicRequest = path[0] === 'public' && path.length === 2;
  if (publicRequest && !/^[a-f0-9]{64}$/.test(path[1])) {
    return Response.json({ error: 'Este presupuesto no está disponible.' }, { status: 404 });
  }
  if (!databaseConfigured()) return unavailable();
  try {
    const actor = publicRequest ? null : await getUser();
    if (!publicRequest && !actor) {
      return Response.json({ error: 'Inicia sesión para continuar.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    // The lock spans all reads and writes of a request, including count guards.
    const lock = actor ? `owner:${actor.userId}` : `public:${path[1]}`;
    return await withDatabaseTransaction(lock, async database => {
      const response = await handleApi(request, path, actor, database);
      // The core converts infrastructure errors into HTTP responses. Re-throw
      // those responses so PostgreSQL rolls back every write in this request.
      if (response.status >= 500) throw new RollbackResponse(response);
      return response;
    });
  } catch (error) {
    if (error instanceof RollbackResponse) return error.response;
    console.error('Cotiza: no se pudo completar la solicitud.');
    return unavailable();
  }
}
export { route as GET, route as POST, route as PUT, route as PATCH, route as DELETE };
