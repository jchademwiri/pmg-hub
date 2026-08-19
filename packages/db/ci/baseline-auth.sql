-- packages/db/ci/baseline-auth.sql
--
-- CI-only fixture. NOT a real migration - do not apply this to staging/prod.
--
-- Every real database (staging/prod) already has the better-auth tables
-- (user, session, account, verification) because they were created outside
-- of drizzle-kit's tracked migration history (see the "baseline detection"
-- comment in packages/db/src/migrate.ts). A migration in
-- packages/db/src/migrations that adds a foreign key to "user" can only
-- ever run against a database that already has this table - drizzle-kit's
-- migration set was never designed to bootstrap a truly empty database.
--
-- This fixture recreates just those tables (matching
-- packages/db/src/schema/auth.ts) so CI's throwaway Postgres container
-- mirrors that same starting state before the tracked migrations run.
-- Keep this in sync with schema/auth.ts if those tables' columns change.

CREATE TABLE "user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "role" text NOT NULL DEFAULT 'viewer',
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE "session" (
  "id" text PRIMARY KEY,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON "session" ("user_id");

CREATE TABLE "account" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "account_userId_idx" ON "account" ("user_id");

CREATE TABLE "verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
