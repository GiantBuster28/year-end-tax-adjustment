-- PostgreSQL initialization script
-- Runs once when the container is first created.
-- Application schema migrations are handled by Alembic.

-- pgcrypto: provides gen_random_uuid(), crypt(), digest(), etc.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
