-- Onboarding wizard: track completion so new users finish schedule + team setup.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Existing users: do not force the wizard retroactively.
UPDATE profiles
SET onboarding_completed_at = COALESCE(created_at, NOW())
WHERE onboarding_completed_at IS NULL;
