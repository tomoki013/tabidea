ALTER TABLE IF EXISTS compose_runs
  ADD COLUMN IF NOT EXISTS current_step TEXT,
  ADD COLUMN IF NOT EXISTS current_message TEXT,
  ADD COLUMN IF NOT EXISTS progress_payload JSONB,
  ADD COLUMN IF NOT EXISTS result_payload JSONB,
  ADD COLUMN IF NOT EXISTS error_payload JSONB,
  ADD COLUMN IF NOT EXISTS access_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS options_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_compose_runs_access_token_hash
ON compose_runs(access_token_hash);
