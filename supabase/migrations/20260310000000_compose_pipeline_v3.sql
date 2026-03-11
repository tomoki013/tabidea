-- compose_runs: パイプライン実行記録
CREATE TABLE IF NOT EXISTS compose_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  run_id TEXT UNIQUE NOT NULL,
  pipeline_version TEXT NOT NULL DEFAULT 'v3',
  input_snapshot JSONB,
  semantic_plan_snapshot JSONB,
  selected_stops_snapshot JSONB,
  final_itinerary_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'started',
  total_duration_ms INT,
  model_name TEXT,
  model_tier TEXT,
  candidate_count INT,
  resolved_count INT,
  filtered_count INT,
  dropped_count INT,
  warning_count INT,
  fallback_used BOOLEAN DEFAULT false,
  error_message TEXT,
  failed_step TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- compose_run_steps: ステップごとの実行ログ
CREATE TABLE IF NOT EXISTS compose_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL REFERENCES compose_runs(run_id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- route_matrix_cache: ルート計算結果キャッシュ (Phase 2 用)
CREATE TABLE IF NOT EXISTS route_matrix_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_place_id TEXT NOT NULL,
  to_place_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  duration_minutes REAL,
  distance_meters REAL,
  polyline TEXT,
  source TEXT NOT NULL DEFAULT 'haversine',
  provenance_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (from_place_id, to_place_id, mode)
);

-- places_cache enhancement: add provenance columns
ALTER TABLE IF EXISTS places_cache
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_places_v1',
  ADD COLUMN IF NOT EXISTS provenance_version TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compose_runs_user ON compose_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_compose_runs_status ON compose_runs(status);
CREATE INDEX IF NOT EXISTS idx_compose_runs_created ON compose_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_compose_run_steps_run ON compose_run_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_route_matrix_cache_pair ON route_matrix_cache(from_place_id, to_place_id, mode);
CREATE INDEX IF NOT EXISTS idx_route_matrix_cache_expires ON route_matrix_cache(expires_at);

-- RLS
ALTER TABLE compose_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compose_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_matrix_cache ENABLE ROW LEVEL SECURITY;

-- Service role only for compose_runs/steps (server-side logging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compose_runs'
      AND policyname = 'service_role_compose_runs'
  ) THEN
    CREATE POLICY "service_role_compose_runs" ON compose_runs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compose_run_steps'
      AND policyname = 'service_role_compose_run_steps'
  ) THEN
    CREATE POLICY "service_role_compose_run_steps" ON compose_run_steps FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'route_matrix_cache'
      AND policyname = 'service_role_route_matrix_cache'
  ) THEN
    CREATE POLICY "service_role_route_matrix_cache" ON route_matrix_cache FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Users can read own runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compose_runs'
      AND policyname = 'users_read_own_runs'
  ) THEN
    CREATE POLICY "users_read_own_runs" ON compose_runs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
