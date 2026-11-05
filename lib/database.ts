import 'server-only';
import postgres from 'postgres';
import type { Database, DatabaseResult, DatabaseValue, PreparedStatement } from './database-types';

type QueryRows = Array<Record<string, unknown>> & { count?: number };
export type QueryExecutor = (query: string, values: readonly DatabaseValue[]) => Promise<QueryRows>;

/** Convert only bind markers, leaving quoted SQL and comments untouched. */
export function compileQuery(query: string, valueCount: number): string {
  let output = '';
  let markers = 0;
  let index = 0;
  while (index < query.length) {
    const char = query[index];
    if (char === "'" || char === '"') {
      const quote = char;
      const escapeString = quote === "'" && index > 0 && /[eE]/.test(query[index - 1]) && (index < 2 || !/[\w$]/.test(query[index - 2]));
      output += char;
      index++;
      let closed = false;
      while (index < query.length) {
        const current = query[index++];
        output += current;
        if (escapeString && current === '\\' && index < query.length) {
          output += query[index++];
        } else if (current === quote) {
          if (query[index] === quote) output += query[index++];
          else { closed = true; break; }
        }
      }
      if (!closed) throw new Error('SQL contains an unterminated quoted value.');
    } else if (char === '-' && query[index + 1] === '-') {
      const end = query.indexOf('\n', index);
      if (end === -1) { output += query.slice(index); index = query.length; }
      else { output += query.slice(index, end + 1); index = end + 1; }
    } else if (char === '/' && query[index + 1] === '*') {
      let depth = 1;
      output += '/*';
      index += 2;
      while (index < query.length && depth) {
        if (query.slice(index, index + 2) === '/*') { output += '/*'; index += 2; depth++; }
        else if (query.slice(index, index + 2) === '*/') { output += '*/'; index += 2; depth--; }
        else output += query[index++];
      }
      if (depth) throw new Error('SQL contains an unterminated comment.');
    } else if (char === '$') {
      const tag = query.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
      if (tag) {
        const end = query.indexOf(tag, index + tag.length);
        if (end === -1) throw new Error('SQL contains an unterminated dollar-quoted value.');
        output += query.slice(index, end + tag.length);
        index = end + tag.length;
      } else {
        if (/^\$[0-9]+/.test(query.slice(index))) throw new Error('Use question-mark bind markers in application SQL.');
        output += char;
        index++;
      }
    } else if (char === '?') {
      output += `$${++markers}`;
      index++;
    } else { output += char; index++; }
  }
  if (markers !== valueCount) throw new Error('SQL bind marker count does not match its values.');
  return output;
}

/** The executor must belong to one already-open transaction. */
export function createDatabase(execute: QueryExecutor): Database {
  function prepare(query: string, values: readonly DatabaseValue[] = []): PreparedStatement {
    const snapshot = Object.freeze([...values]);
    async function run<T>(): Promise<DatabaseResult<T>> {
      const rows = await execute(compileQuery(query, snapshot.length), snapshot);
      return { success: true, results: [...rows] as T[], meta: { changes: Number(rows.count ?? 0) } };
    }
    return {
      query,
      values: snapshot,
      bind(...parameters) { return prepare(query, parameters); },
      async first<T>(column?: string) {
        const result = await run<Record<string, unknown>>();
        const row = result.results[0];
        if (!row) return null;
        return (column === undefined ? row : row[column] ?? null) as T | null;
      },
      all: run,
      run,
    };
  }
  return {
    prepare,
    async batch<T>(statements: PreparedStatement[]) {
      const results: DatabaseResult<T>[] = [];
      // Supabase's transaction pooler does not support query pipelining.
      for (const statement of statements) results.push(await prepare(statement.query, statement.values).run<T>());
      return results;
    },
  };
}

function connectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
}

export function databaseConfigured(): boolean { return Boolean(connectionString()); }

let pool: ReturnType<typeof postgres> | undefined;
function getPool() {
  if (pool) return pool;
  const value = connectionString();
  if (!value) throw new Error('La base de datos todavía no está configurada.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('La conexión de base de datos no tiene un formato válido.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error('La conexión de base de datos no tiene un formato válido.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  pool = postgres(value, {
    max: 1,
    prepare: false,
    max_pipeline: 1,
    ssl: local ? false : 'require',
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    onnotice: () => {},
  });
  return pool;
}

export function transactionScope(lockKey: string): { ownerId: string; publicToken: string } {
  const owner = /^owner:([A-Za-z0-9_-]{1,128})$/.exec(lockKey);
  if (owner) return { ownerId: owner[1], publicToken: '' };
  const shared = /^public:([a-f0-9]{64})$/.exec(lockKey);
  if (shared) return { ownerId: '', publicToken: shared[1] };
  throw new Error('Invalid database transaction scope.');
}

export async function withDatabaseTransaction<T>(lockKey: string, callback: (database: Database) => Promise<T>): Promise<T> {
  const scope = transactionScope(lockKey);
  const sql = getPool();
  return sql.begin(async transaction => {
    await transaction`SET LOCAL statement_timeout = '20s'`;
    await transaction`SET LOCAL lock_timeout = '10s'`;
    // Both values are replaced on every request and reset by PostgreSQL at the
    // transaction boundary, including when using a shared transaction pooler.
    await transaction`SELECT set_config('cotiza.owner_id', ${scope.ownerId}, true), set_config('cotiza.public_token', ${scope.publicToken}, true)`;
    // Transaction-scoped locking also works with Supabase's transaction pooler.
    await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`cotiza:${lockKey}`}, 0))`;
    const database = createDatabase(async (query, values) => {
      const rows = await transaction.unsafe(query, [...values]);
      return rows as unknown as QueryRows;
    });
    return callback(database);
  }) as Promise<T>;
}

export async function closeDatabase(): Promise<void> {
  const current = pool;
  pool = undefined;
  if (current) await current.end({ timeout: 5 });
}
