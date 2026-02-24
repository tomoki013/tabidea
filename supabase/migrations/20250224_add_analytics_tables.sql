-- ============================================================================
-- Event Measurement Tables
-- PR-L: Analytics infrastructure for plan generation & replan tracking
-- ============================================================================

-- プラン生成ログ
CREATE TABLE IF NOT EXISTS generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  destination text,
  duration_days int,
  model_name text,
  model_tier text,
  processing_time_ms int,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- リプランイベント
CREATE TABLE IF NOT EXISTS replan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid,
  trigger_type text NOT NULL,
  trigger_reason text,
  suggestion_accepted boolean,
  human_resolution_score float,
  processing_time_ms int,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_event_type ON generation_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created_at ON generation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_replan_events_user_id ON replan_events(user_id);
CREATE INDEX IF NOT EXISTS idx_replan_events_plan_id ON replan_events(plan_id);
CREATE INDEX IF NOT EXISTS idx_replan_events_trigger_type ON replan_events(trigger_type);
CREATE INDEX IF NOT EXISTS idx_replan_events_created_at ON replan_events(created_at);

-- RLS ポリシー
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE replan_events ENABLE ROW LEVEL SECURITY;

-- サービスロールのみ書き込み可能
CREATE POLICY "Service role can insert generation_logs"
  ON generation_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert replan_events"
  ON replan_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 認証済みユーザーは自分のレコードを読み取り可能
CREATE POLICY "Users can read own generation_logs"
  ON generation_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own replan_events"
  ON replan_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
