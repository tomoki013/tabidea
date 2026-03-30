-- Agent runtime Phase 2
-- run_events: logical run / SSE event persistence
-- user_preferences: opt-in memory profile envelope
-- eval_results: rule-based / LLM-based evaluation metrics
-- tool_audit_logs: tool provenance and audit trail

CREATE TABLE IF NOT EXISTS run_events (
  event_id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL,
  seq INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, seq)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  schema_version INTEGER NOT NULL DEFAULT 1,
  profile_json JSONB,
  capabilities_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'explicit',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_results (
  eval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  trip_id UUID REFERENCES trips(trip_id) ON DELETE CASCADE,
  trip_version INTEGER,
  eval_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_audit_logs (
  tool_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  tool_name TEXT NOT NULL,
  request_json JSONB,
  response_json JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  latency_ms INTEGER,
  provider TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_id_seq ON run_events(run_id, seq);
CREATE INDEX IF NOT EXISTS idx_run_events_created_at ON run_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_results_run_id ON eval_results(run_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_trip_version ON eval_results(trip_id, trip_version);
CREATE INDEX IF NOT EXISTS idx_tool_audit_logs_run_id ON tool_audit_logs(run_id, created_at DESC);

ALTER TABLE run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'run_events'
      AND policyname = 'service_role_run_events'
  ) THEN
    CREATE POLICY "service_role_run_events"
      ON run_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_preferences'
      AND policyname = 'service_role_user_preferences'
  ) THEN
    CREATE POLICY "service_role_user_preferences"
      ON user_preferences
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eval_results'
      AND policyname = 'service_role_eval_results'
  ) THEN
    CREATE POLICY "service_role_eval_results"
      ON eval_results
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_audit_logs'
      AND policyname = 'service_role_tool_audit_logs'
  ) THEN
    CREATE POLICY "service_role_tool_audit_logs"
      ON tool_audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_preferences'
      AND policyname = 'users_manage_own_preferences'
  ) THEN
    CREATE POLICY "users_manage_own_preferences"
      ON user_preferences
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'run_events'
      AND policyname = 'users_read_own_run_events'
  ) THEN
    CREATE POLICY "users_read_own_run_events"
      ON run_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM generation_sessions
          WHERE generation_sessions.id = run_events.run_id
            AND generation_sessions.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eval_results'
      AND policyname = 'users_read_own_eval_results'
  ) THEN
    CREATE POLICY "users_read_own_eval_results"
      ON eval_results
      FOR SELECT
      TO authenticated
      USING (
        (trip_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM trips
          WHERE trips.trip_id = eval_results.trip_id
            AND trips.user_id = auth.uid()
        ))
        OR
        (run_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM generation_sessions
          WHERE generation_sessions.id = eval_results.run_id
            AND generation_sessions.user_id = auth.uid()
        ))
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_audit_logs'
      AND policyname = 'users_read_own_tool_audit_logs'
  ) THEN
    CREATE POLICY "users_read_own_tool_audit_logs"
      ON tool_audit_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM generation_sessions
          WHERE generation_sessions.id = tool_audit_logs.run_id
            AND generation_sessions.user_id = auth.uid()
        )
      );
  END IF;
END $$;
