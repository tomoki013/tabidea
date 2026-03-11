-- ============================================================================
-- Reflections Table
-- PR-N: Post-trip feedback collection
-- ============================================================================

CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  satisfaction text NOT NULL CHECK (satisfaction IN ('helped', 'neutral', 'struggled')),
  replan_useful boolean,
  free_text text,
  submitted_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reflections_plan_id ON reflections(plan_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_satisfaction ON reflections(satisfaction);

-- RLS ポリシー
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- サービスロールのみ書き込み可能
CREATE POLICY "Service role can insert reflections"
  ON reflections FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 認証済みユーザーは自分のレコードを読み取り可能
CREATE POLICY "Users can read own reflections"
  ON reflections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
