-- Rate limit durable de sugerencias IA (multi-instancia / serverless).
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_created
  ON ai_rate_limits(user_id, created_at DESC);
