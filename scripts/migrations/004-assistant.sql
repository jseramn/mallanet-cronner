-- Asistente IA: conversaciones, mensajes y captura de requerimientos

CREATE TABLE IF NOT EXISTS assistant_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'Nueva conversación',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_user
  ON assistant_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv
  ON assistant_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS user_requirements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES assistant_conversations(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'feature'
    CHECK (category IN ('feature', 'bug', 'ux', 'integration', 'other')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'planned', 'done', 'wontfix')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_requirements_user
  ON user_requirements(user_id, created_at DESC);

-- Rate limit por propósito (slots | assistant)
ALTER TABLE ai_rate_limits
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'slots';

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_purpose
  ON ai_rate_limits(user_id, purpose, created_at DESC);
