-- Runs cutover Phase 3
-- generation_sessions 系を新しい runs 系へ移し、run_events/eval/tool_audit の参照先を runs に切り替える

CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'created',
  input_snapshot JSONB,
  pipeline_context JSONB,
  normalized_input JSONB,
  generation_profile JSONB,
  draft_plan JSONB,
  evaluation_report JSONB,
  repair_history JSONB DEFAULT '[]'::jsonb,
  verified_entities JSONB DEFAULT '[]'::jsonb,
  timeline_state JSONB,
  narrative_state JSONB,
  ui_projection JSONB,
  checkpoint_cursor TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,
  input_hash TEXT,
  rubric_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS run_pass_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  pass_id TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL,
  duration_ms INTEGER,
  checkpoint_cursor TEXT,
  metadata JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS run_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  pass_id TEXT NOT NULL,
  cursor TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_pass_runs_run ON run_pass_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_run_pass_runs_pass ON run_pass_runs(pass_id);
CREATE INDEX IF NOT EXISTS idx_run_checkpoints_run ON run_checkpoints(run_id);

INSERT INTO runs (
  id,
  user_id,
  state,
  input_snapshot,
  pipeline_context,
  normalized_input,
  generation_profile,
  draft_plan,
  evaluation_report,
  repair_history,
  verified_entities,
  timeline_state,
  narrative_state,
  ui_projection,
  checkpoint_cursor,
  warnings,
  input_hash,
  rubric_version,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  state,
  input_snapshot,
  pipeline_context,
  normalized_input,
  generation_profile,
  draft_plan,
  evaluation_report,
  repair_history,
  verified_entities,
  timeline_state,
  narrative_state,
  ui_projection,
  checkpoint_cursor,
  warnings,
  input_hash,
  rubric_version,
  created_at,
  updated_at
FROM generation_sessions
ON CONFLICT (id) DO NOTHING;

INSERT INTO run_pass_runs (
  id,
  run_id,
  pass_id,
  attempt,
  outcome,
  duration_ms,
  checkpoint_cursor,
  metadata,
  started_at,
  completed_at
)
SELECT
  id,
  session_id,
  pass_id,
  attempt,
  outcome,
  duration_ms,
  checkpoint_cursor,
  metadata,
  started_at,
  completed_at
FROM generation_pass_runs
ON CONFLICT (id) DO NOTHING;

INSERT INTO run_checkpoints (
  id,
  run_id,
  pass_id,
  cursor,
  snapshot,
  created_at
)
SELECT
  id,
  session_id,
  pass_id,
  cursor,
  snapshot,
  created_at
FROM generation_checkpoints
ON CONFLICT (id) DO NOTHING;

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_pass_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_checkpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'runs' AND policyname = 'service_role_runs'
  ) THEN
    CREATE POLICY "service_role_runs"
      ON runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'run_pass_runs' AND policyname = 'service_role_run_pass_runs'
  ) THEN
    CREATE POLICY "service_role_run_pass_runs"
      ON run_pass_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'run_checkpoints' AND policyname = 'service_role_run_checkpoints'
  ) THEN
    CREATE POLICY "service_role_run_checkpoints"
      ON run_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'runs' AND policyname = 'users_read_own_runs'
  ) THEN
    CREATE POLICY "users_read_own_runs"
      ON runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'run_events' AND policyname = 'users_read_own_run_events'
  ) THEN
    DROP POLICY "users_read_own_run_events" ON run_events;
  END IF;

  CREATE POLICY "users_read_own_run_events"
    ON run_events
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM runs
        WHERE runs.id = run_events.run_id
          AND runs.user_id = auth.uid()
      )
    );
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'eval_results' AND policyname = 'users_read_own_eval_results'
  ) THEN
    DROP POLICY "users_read_own_eval_results" ON eval_results;
  END IF;

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
        FROM runs
        WHERE runs.id = eval_results.run_id
          AND runs.user_id = auth.uid()
      ))
    );
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tool_audit_logs' AND policyname = 'users_read_own_tool_audit_logs'
  ) THEN
    DROP POLICY "users_read_own_tool_audit_logs" ON tool_audit_logs;
  END IF;

  CREATE POLICY "users_read_own_tool_audit_logs"
    ON tool_audit_logs
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM runs
        WHERE runs.id = tool_audit_logs.run_id
          AND runs.user_id = auth.uid()
      )
    );
END $$;
