CREATE TABLE business_profiles (
  owner_id text PRIMARY KEY,
  data text NOT NULL CHECK (jsonb_typeof(data::jsonb) = 'object'),
  updated_at text NOT NULL
);

CREATE TABLE clients (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES business_profiles(owner_id),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at text NOT NULL
);
CREATE INDEX clients_owner_idx ON clients(owner_id);

CREATE TABLE services (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES business_profiles(owner_id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit text NOT NULL,
  price double precision NOT NULL CHECK (price >= 0 AND price <= 1000000000),
  created_at text NOT NULL
);
CREATE INDEX services_owner_idx ON services(owner_id);

CREATE TABLE quotes (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES business_profiles(owner_id),
  number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'changes_requested', 'rejected')),
  currency text NOT NULL CHECK (currency IN ('PYG', 'USD')),
  data text NOT NULL CHECK (jsonb_typeof(data::jsonb) = 'object'),
  token text CHECK (token IS NULL OR token ~ '^[a-f0-9]{64}$'),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  deleted integer NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  response_note text NOT NULL DEFAULT '',
  created_month text NOT NULL CHECK (created_month ~ '^[0-9]{4}-[0-9]{2}$')
);
CREATE INDEX quotes_owner_month_idx ON quotes(owner_id, created_month);
CREATE UNIQUE INDEX quotes_token_idx ON quotes(token);

-- Browsers use Supabase Auth only. Application records are served exclusively
-- by Cotiza's server, which verifies identity and authorizes each operation.
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE business_profiles, clients, services, quotes FROM PUBLIC;
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE business_profiles, clients, services, quotes FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE business_profiles, clients, services, quotes FROM authenticated;
  END IF;
END
$roles$;
