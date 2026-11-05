import postgres from 'postgres';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

// The direct/session URL can differ from the transaction pooler used at runtime.
const connection = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
if (!connection) {
  console.error('Falta DATABASE_MIGRATION_URL o DATABASE_URL para aplicar las migraciones.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
} catch {
  console.error('La conexión de base de datos no tiene un formato válido.');
  process.exit(1);
}
const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
const sql = postgres(connection, { max: 1, prepare: false, max_pipeline: 1, ssl: local ? false : 'require', connect_timeout: 10, onnotice: () => {} });

try {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
  await sql.begin(async transaction => {
    await transaction`SET LOCAL lock_timeout = '15s'`;
    await transaction`SELECT pg_advisory_xact_lock(hashtextextended('cotiza:migrations', 0))`;
    await transaction`CREATE TABLE IF NOT EXISTS cotiza_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    await transaction`REVOKE ALL ON TABLE cotiza_migrations FROM PUBLIC`;
    await transaction.unsafe(`DO $roles$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE cotiza_migrations FROM anon; END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE cotiza_migrations FROM authenticated; END IF;
      END
      $roles$;`);
    const applied = await transaction`SELECT name, checksum FROM cotiza_migrations`;
    const checksums = new Map(applied.map(row => [row.name, row.checksum]));
    let count = 0;
    for (const name of files) {
      const contents = await readFile(new URL(name, directory), 'utf8');
      const checksum = createHash('sha256').update(contents).digest('hex');
      if (checksums.has(name)) {
        if (checksums.get(name) !== checksum) throw new Error(`La migración aplicada ${name} fue modificada; agrega una nueva migración.`);
        continue;
      }
      await transaction.unsafe(contents);
      await transaction`INSERT INTO cotiza_migrations (name, checksum) VALUES (${name}, ${checksum})`;
      console.log(`Migración aplicada: ${name}`);
      count++;
    }
    console.log(count ? `${count} migración(es) preparada(s).` : 'La base de datos ya está actualizada.');
  });
  console.log('Migraciones confirmadas.');
} catch (error) {
  // Database errors can include parameters or connection details; do not log them.
  console.error(error instanceof Error && error.message.startsWith('La migración aplicada ') ? error.message : 'No se pudieron aplicar las migraciones. Revisa la conexión y los permisos de la base.');
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
