-- The runtime credential is provisioned separately. The static migration never
-- contains a password and leaves a new role unable to log in.
DO $runtime$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cotiza_runtime') THEN
    CREATE ROLE cotiza_runtime NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB
      NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSIF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'cotiza_runtime'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'The existing cotiza_runtime role has unexpected elevated privileges';
  END IF;
END
$runtime$;

GRANT USAGE ON SCHEMA public TO cotiza_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.business_profiles, public.clients, public.services, public.quotes
  TO cotiza_runtime;

-- Browser/API roles cannot become the runtime role, and the runtime role does
-- not inherit their permissions. It has no grants on Auth or migration tables.
DO $isolation$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE cotiza_runtime FROM anon;
    REVOKE anon FROM cotiza_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE cotiza_runtime FROM authenticated;
    REVOKE authenticated FROM cotiza_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    REVOKE cotiza_runtime FROM authenticator;
    REVOKE authenticator FROM cotiza_runtime;
  END IF;
END
$isolation$;

CREATE POLICY cotiza_runtime_owner ON public.business_profiles
  FOR ALL TO cotiza_runtime
  USING (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')))
  WITH CHECK (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')));

CREATE POLICY cotiza_runtime_owner ON public.clients
  FOR ALL TO cotiza_runtime
  USING (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')))
  WITH CHECK (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')));

CREATE POLICY cotiza_runtime_owner ON public.services
  FOR ALL TO cotiza_runtime
  USING (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')))
  WITH CHECK (owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), '')));

CREATE POLICY cotiza_runtime_owner_or_shared ON public.quotes
  FOR ALL TO cotiza_runtime
  USING (
    owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), ''))
    OR (
      token = (SELECT NULLIF(current_setting('cotiza.public_token', true), ''))
      AND deleted = 0 AND status <> 'draft'
    )
  )
  WITH CHECK (
    owner_id = (SELECT NULLIF(current_setting('cotiza.owner_id', true), ''))
    OR (
      token = (SELECT NULLIF(current_setting('cotiza.public_token', true), ''))
      AND deleted = 0 AND status <> 'draft'
    )
  );
