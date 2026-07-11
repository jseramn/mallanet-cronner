-- Un usuario solo puede pertenecer a un equipo (regla de producto).
-- Limpia duplicados residuales dejando la membresía más antigua.
DELETE FROM team_members tm
USING team_members older
WHERE tm.user_id = older.user_id
  AND tm.joined_at > older.joined_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_unique
  ON team_members(user_id);
