CREATE ROLE grp_play14_prod WITH
  NOLOGIN
  NOSUPERUSER
  INHERIT
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

GRANT CONNECT ON DATABASE play14_prod TO grp_play14_prod;
GRANT USAGE, CREATE ON SCHEMA public TO grp_play14_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO grp_play14_prod;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO grp_play14_prod;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO grp_play14_prod;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO grp_play14_prod;

CREATE USER usr_play14_prod WITH PASSWORD 'mypassword';
GRANT grp_play14_prod TO usr_play14_prod;

-- Make usr_play14_prod the owner of the schema
ALTER SCHEMA public OWNER TO usr_play14_prod;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO usr_play14_prod;';
    END LOOP;
END $$;

-- Change all sequence owners
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO usr_play14_prod;';
    END LOOP;
END $$;
