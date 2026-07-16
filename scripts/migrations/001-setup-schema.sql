-- Mallanet Cronner — esquema inicial
-- Tablas de Better Auth (camelCase entre comillas, formato por defecto de Better Auth)

CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON "verification"("identifier");

-- Tablas de dominio (snake_case)

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  display_name VARCHAR(80) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  work_mode VARCHAR(20) NOT NULL DEFAULT 'full-time'
    CHECK (work_mode IN ('full-time', 'part-time')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  invite_code VARCHAR(12) NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_minute INT NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute INT NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  status VARCHAR(12) NOT NULL
    CHECK (status IN ('available', 'limited', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_minute > start_minute)
);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_user_id ON recurring_schedules(user_id);

CREATE TABLE IF NOT EXISTS time_blocks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(12) NOT NULL
    CHECK (status IN ('available', 'limited', 'blocked')),
  title VARCHAR(120),
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_range ON time_blocks(user_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS collab_slots (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  title VARCHAR(120) NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_collab_slots_team_range ON collab_slots(team_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_collab_slots_created_by ON collab_slots(created_by);

CREATE TABLE IF NOT EXISTS collab_slot_claims (
  slot_id INT NOT NULL REFERENCES collab_slots(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slot_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_collab_slot_claims_user_id ON collab_slot_claims(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
