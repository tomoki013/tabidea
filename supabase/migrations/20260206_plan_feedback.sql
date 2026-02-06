-- Plan Feedback table for collecting user evaluations
CREATE TABLE IF NOT EXISTS plan_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT,                          -- plans.share_code への参照（NULLable: 未保存プラン）
  user_id UUID REFERENCES auth.users(id), -- NULLable: 未ログインユーザー
  -- プラン全体の評価
  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  -- 正確性の問題報告
  accuracy_issues JSONB DEFAULT '[]',    -- [{day: 1, activityIndex: 2, issue: "閉店済み"}]
  -- 自由コメント
  comment TEXT,
  -- メタデータ
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: ユーザーは自分のフィードバックのみ読み書き可能
ALTER TABLE plan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON plan_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read own feedback"
  ON plan_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_plan_feedback_plan_id ON plan_feedback(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_feedback_user_id ON plan_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_feedback_created_at ON plan_feedback(created_at);
