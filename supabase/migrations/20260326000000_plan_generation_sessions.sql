-- Plan Generation Sessions (v4 LM-First Pipeline)
-- セッション管理、パス実行ログ、チェックポイント

-- ============================================
-- generation_sessions: セッション状態 + 蓄積データ
-- ============================================

CREATE TABLE IF NOT EXISTS generation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'created',
  input_snapshot JSONB,
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

-- ============================================
-- generation_pass_runs: パス実行ログ
-- ============================================

CREATE TABLE IF NOT EXISTS generation_pass_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
  pass_id TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL,
  duration_ms INTEGER,
  checkpoint_cursor TEXT,
  metadata JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- generation_checkpoints: 中断再開用スナップショット
-- ============================================

CREATE TABLE IF NOT EXISTS generation_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES generation_sessions(id) ON DELETE CASCADE,
  pass_id TEXT NOT NULL,
  cursor TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gen_sessions_user ON generation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_sessions_state ON generation_sessions(state);
CREATE INDEX IF NOT EXISTS idx_gen_sessions_created ON generation_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_gen_pass_runs_session ON generation_pass_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_gen_pass_runs_pass ON generation_pass_runs(pass_id);
CREATE INDEX IF NOT EXISTS idx_gen_checkpoints_session ON generation_checkpoints(session_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE generation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_pass_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_checkpoints ENABLE ROW LEVEL SECURITY;

-- Service role: full access
CREATE POLICY "service_role_gen_sessions" ON generation_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_gen_pass_runs" ON generation_pass_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_gen_checkpoints" ON generation_checkpoints
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users: read own sessions
CREATE POLICY "users_read_own_sessions" ON generation_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
