-- Generation Metrics table for tracking AI output quality KPIs
CREATE TABLE IF NOT EXISTS generation_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id TEXT UNIQUE NOT NULL,
  -- パフォーマンス
  outline_time_ms INTEGER,
  detail_time_ms INTEGER,
  total_time_ms INTEGER,
  -- 品質
  validation_pass_rate REAL,
  self_correction_count INTEGER DEFAULT 0,
  citation_rate REAL,
  rag_articles_used INTEGER,
  -- ユーザー（後から更新）
  user_rating SMALLINT,
  accuracy_issue_count INTEGER DEFAULT 0,
  -- メタデータ
  model_name TEXT,
  destination TEXT,
  duration_days INTEGER,
  prompt_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_generation_metrics_created_at ON generation_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_metrics_prompt_version ON generation_metrics(prompt_version);
CREATE INDEX IF NOT EXISTS idx_generation_metrics_destination ON generation_metrics(destination);
